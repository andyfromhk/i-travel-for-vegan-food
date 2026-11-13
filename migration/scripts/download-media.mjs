// Downloads every image listed in migration/media-manifest.json into public/media/, then measures each
// one and writes src/data/media.json (path -> [width, height]) so pages can reserve the right space
// for an image before it loads.
//
// Safe to re-run: files that are already there are skipped.
//
// Run:  node migration/scripts/download-media.mjs

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { imageSize } from "image-size";

const CONCURRENCY = 10;
const manifest = JSON.parse(
  await readFile("migration/media-manifest.json", "utf8"),
);

const exists = async (file) => {
  try {
    return (await stat(file)).size > 0;
  } catch {
    return false;
  }
};

async function download(url) {
  // Older images may only answer on Webflow's previous CDN host, so both are tried.
  const candidates = [
    url,
    url.replace("cdn.prod.website-files.com", "uploads-ssl.webflow.com"),
  ];
  let lastError = "";
  for (const candidate of [...new Set(candidates)]) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(candidate);
        if (res.ok) return Buffer.from(await res.arrayBuffer());
        lastError = `HTTP ${res.status}`;
        if (res.status === 404 || res.status === 403) break;
      } catch (error) {
        lastError = String(error.cause?.code || error.message);
      }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw new Error(lastError);
}

const failures = [];
let next = 0;
let fetched = 0;
let skipped = 0;
let bytes = 0;

async function worker() {
  while (next < manifest.length) {
    const entry = manifest[next++];
    const file = path.join("public", entry.path);
    if (await exists(file)) {
      skipped++;
      continue;
    }
    try {
      const data = await download(entry.url);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data);
      fetched++;
      bytes += data.length;
      if (fetched % 250 === 0)
        console.log(
          `  ${fetched} downloaded (${Math.round(bytes / 1048576)} MB)`,
        );
    } catch (error) {
      failures.push({ ...entry, error: error.message });
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// Measure everything that is on disk.
const sizes = {};
let total = 0;
for (const entry of manifest) {
  const file = path.join("public", entry.path);
  try {
    const data = await readFile(file);
    total += data.length;
    const { width, height, orientation } = imageSize(data);
    // Photos marked "rotated" by a camera show with width and height swapped.
    sizes[entry.path] =
      orientation && orientation >= 5 ? [height, width] : [width, height];
  } catch {
    if (!failures.some((f) => f.path === entry.path))
      failures.push({ ...entry, error: "missing or unreadable" });
  }
}
const sorted = Object.fromEntries(
  Object.entries(sizes).sort(([a], [b]) => a.localeCompare(b)),
);
await mkdir("src/data", { recursive: true });
await writeFile(
  "src/data/media.json",
  JSON.stringify(sorted).replace(/\],/g, "],\n") + "\n",
);
await mkdir("migration/tmp", { recursive: true });
await writeFile(
  "migration/tmp/media-failures.json",
  JSON.stringify(failures, null, 1),
);

console.log(
  `Downloaded ${fetched}, already had ${skipped}, failed ${failures.length}.`,
);
console.log(
  `${Object.keys(sizes).length} images on disk, ${Math.round(total / 1048576)} MB in total.`,
);
for (const f of failures.slice(0, 20))
  console.log(`  FAILED ${f.url} (${f.error})`);
