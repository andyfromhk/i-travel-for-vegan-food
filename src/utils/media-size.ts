// Width and height of an image in public/, so a page can hold the image's space while it loads.
//
// Images that came over from Webflow are listed in src/data/media.json. Anything added later
// (for example an upload through Pages CMS) isn't in that list, so its size is read from the file.

import { readFileSync } from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";

const PUBLIC = path.join(process.cwd(), "public");
const known: Record<string, [number, number] | null> = JSON.parse(
  readFileSync(path.join(process.cwd(), "src/data/media.json"), "utf8"),
);

/** `[width, height]` of an image such as `/media/x.webp`, or `undefined` for a remote or missing file. */
export function sizeOf(src?: string): [number, number] | undefined {
  if (!src || !src.startsWith("/")) return undefined;
  if (!(src in known)) {
    let size: [number, number] | null = null;
    try {
      const file = path.join(PUBLIC, decodeURIComponent(src.split(/[?#]/)[0]));
      if (file.startsWith(PUBLIC)) {
        const found = imageSize(readFileSync(file));
        // Phone photos can be stored sideways with a note to turn them; report the size as shown.
        const turned = (found.orientation ?? 1) >= 5;
        if (found.width && found.height)
          size = turned
            ? [found.height, found.width]
            : [found.width, found.height];
      }
    } catch {
      // Not an image we can read (or not there): the page simply won't reserve its space.
    }
    known[src] = size;
  }
  return known[src] ?? undefined;
}
