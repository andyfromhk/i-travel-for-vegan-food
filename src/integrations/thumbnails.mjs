// Makes the smaller photo copies that pages point at (see src/utils/thumbs.ts), once the site is built.
//
// It reads every built page, collects each /media/_w{width}/{photo}.webp address, and writes that copy
// into dist/ from the original in public/media/. Copies are also kept in node_modules/.cache, so a
// rebuild only makes the ones that are new or whose photo changed.

import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// The copy's name is the original's plus .webp (x.jpg -> x.jpg.webp, x.webp -> x.webp.webp),
// so the match runs to the last ".webp" before the address ends.
const THUMB = /\/media\/_w(\d+)\/([^"'\s,)]+)\.webp(?=["'\s,)])/g;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(file);
    else if (entry.name.endsWith(".html")) yield file;
  }
}

/** @returns {import("astro").AstroIntegration} */
export default function thumbnails() {
  return {
    name: "itfvf-thumbnails",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const root = process.cwd();
        const cache = path.join(root, "node_modules/.cache/itfvf-thumbnails");

        const wanted = new Map(); // "480/destinations/x.jpg" -> { width, photo }
        for await (const file of htmlFiles(dist)) {
          for (const [, width, photo] of (
            await readFile(file, "utf8")
          ).matchAll(THUMB))
            wanted.set(`${width}/${photo}`, { width: Number(width), photo });
        }

        let made = 0;
        let reused = 0;
        const missing = [];
        const jobs = [...wanted.values()];
        const work = async ({ width, photo }) => {
          const source = path.join(
            root,
            "public/media",
            decodeURIComponent(photo),
          );
          const target = path.join(
            dist,
            "media",
            `_w${width}`,
            `${photo}.webp`,
          );
          let info;
          try {
            info = await stat(source);
          } catch {
            missing.push(photo);
            return;
          }
          const key = createHash("sha1")
            .update(`${photo}|${width}|${info.size}|${info.mtimeMs}`)
            .digest("hex");
          const cached = path.join(cache, `${key}.webp`);
          await mkdir(path.dirname(target), { recursive: true });
          try {
            await copyFile(cached, target);
            reused++;
            return;
          } catch {
            // Not made before: make it now.
          }
          await sharp(source)
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 75, effort: 2 })
            .toFile(target);
          await mkdir(cache, { recursive: true });
          await copyFile(target, cached);
          made++;
        };

        // A few at a time: sharp already uses several threads for each photo.
        const queue = [...jobs];
        await Promise.all(
          Array.from({ length: 4 }, async () => {
            while (queue.length) await work(queue.shift());
          }),
        );

        logger.info(
          `${made} photo copies made, ${reused} reused from the cache.`,
        );
        if (missing.length)
          logger.warn(
            `Pages point at photos that don't exist: ${missing.slice(0, 10).join(", ")}`,
          );
      },
    },
  };
}
