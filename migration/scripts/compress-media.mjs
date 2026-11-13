// Shrinks large photos in public/media in place, keeping every file name and format, so no address changes.
//
//   node migration/scripts/compress-media.mjs              photos over 200 KB
//   node migration/scripts/compress-media.mjs --over 150   photos over 150 KB
//   node migration/scripts/compress-media.mjs --dry-run    only report what would change
//
// Each photo is turned upright (phone photos are often stored sideways with a note to turn them), made at
// most 1,600 pixels wide (and 2,400 tall, so long menu photos stay readable), and saved again at good
// quality. Hidden details such as the camera and GPS location are dropped. A photo is only replaced when
// the new file is at least 10% smaller. src/data/media.json is updated with the new sizes.

import { readFile, readdir, stat, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const overKb = Number(args[args.indexOf("--over") + 1]) || 200;
const dryRun = args.includes("--dry-run");
const ROOT = "public/media";
const SIZES = "src/data/media.json";

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(file);
    else yield file;
  }
}

function encode(image, ext) {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return image.jpeg({ quality: 72, mozjpeg: true });
    case ".webp":
      return image.webp({ quality: 72, effort: 5 });
    case ".png":
      return image.png({
        compressionLevel: 9,
        palette: true,
        quality: 90,
        effort: 8,
      });
    default:
      return null;
  }
}

const sizes = JSON.parse(await readFile(SIZES, "utf8"));
const queue = [];
for await (const file of files(ROOT)) {
  const ext = path.extname(file).toLowerCase();
  if (![".jpg", ".jpeg", ".webp", ".png"].includes(ext)) continue;
  const { size } = await stat(file);
  if (size > overKb * 1024) queue.push({ file, ext, size });
}

let before = 0;
let after = 0;
let replaced = 0;
const kept = [];
async function work({ file, ext, size }) {
  const image = sharp(file).rotate().resize({
    width: 1600,
    height: 2400,
    fit: "inside",
    withoutEnlargement: true,
  });
  const { data, info } = await encode(image, ext).toBuffer({
    resolveWithObject: true,
  });
  if (data.length > size * 0.9) {
    kept.push(file);
    return;
  }
  before += size;
  after += data.length;
  replaced++;
  if (dryRun) return;
  await writeFile(file + ".tmp", data);
  await rename(file + ".tmp", file);
  const key = "/" + path.relative("public", file).split(path.sep).join("/");
  if (key in sizes) sizes[key] = [info.width, info.height];
}

const pending = [...queue];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (pending.length) await work(pending.shift());
  }),
);

// Same layout as migration/scripts/download-media.mjs writes: one photo per line.
if (!dryRun)
  await writeFile(SIZES, JSON.stringify(sizes).replace(/\],/g, "],\n") + "\n");
const mb = (n) => (n / 1048576).toFixed(1);
console.log(
  `${queue.length} photos over ${overKb} KB. ${dryRun ? "Would replace" : "Replaced"} ${replaced}: ` +
    `${mb(before)} MB -> ${mb(after)} MB. Left alone (already about as small as they get): ${kept.length}.`,
);
