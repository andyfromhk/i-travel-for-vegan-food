// Smaller copies of photos for places where they show small: cards and photo grids.
//
// A card needs a photo about 400 pixels wide, but most originals are 1,000 to 1,600. So the page offers
// the browser a choice (srcset): a 480-pixel copy, an 800-pixel copy and the original, and the browser
// picks the smallest one that is still sharp on that screen.
//
// The copies aren't stored anywhere. Pages only point at them (/media/_w480/…), and when the site is
// built, src/integrations/thumbnails.mjs makes every copy a page points at. The originals are untouched.

import { sizeOf } from "@/utils/media-size.ts";

/** Widths of the copies, in pixels. */
const WIDTHS = [600];

/** Where the copy of a photo at a given width lives. Kept in step with src/integrations/thumbnails.mjs. */
export const thumbUrl = (src: string, width: number) =>
  `/media/_w${width}/${src.slice("/media/".length)}.webp`;

/**
 * The `srcset` and `sizes` attributes for a photo shown small. `sizes` tells the browser how wide the
 * photo shows, e.g. "(min-width: 48rem) 18rem, 50vw". Returns nothing for photos that can't have copies
 * (anything outside /media, SVGs and GIFs), and while developing, when the copies don't exist.
 */
export function responsive(
  src: string | undefined,
  sizes: string,
): { srcset?: string; sizes?: string } {
  if (!import.meta.env.PROD || !src || !src.startsWith("/media/")) return {};
  if (/\.(svg|gif)$/i.test(src)) return {};
  const size = sizeOf(src);
  if (!size) return {};
  const smaller = WIDTHS.filter((width) => width < size[0] * 0.9);
  if (!smaller.length) return {};
  return {
    srcset: [
      ...smaller.map((width) => `${thumbUrl(src, width)} ${width}w`),
      `${src} ${size[0]}w`,
    ].join(", "),
    sizes,
  };
}

/** How wide a card's photo shows: half the screen on phones, at most about a third of the page above. */
export const CARD_SIZES = "(min-width: 48rem) 26rem, 50vw";
/** A photo in a photo grid: two across on phones, four across above. */
export const GRID_SIZES = "(min-width: 48rem) 18rem, 50vw";
