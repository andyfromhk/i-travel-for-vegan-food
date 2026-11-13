// Structured data (JSON-LD): the machine-readable description of a page that search engines read.

import { SITE_LOGO, SITE_NAME, SITE_URL } from "@/consts.ts";
import { mediaSize, type Picture } from "@/utils/content.ts";

const absolute = (path: string) => new URL(path, SITE_URL).href;

export const author = {
  "@type": "Person",
  name: "Andy",
  url: absolute("/about"),
};

export const publisher = {
  "@type": "Organization",
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: { "@type": "ImageObject", url: absolute(SITE_LOGO) },
};

export function imageObject(picture?: Picture) {
  if (!picture) return undefined;
  return {
    "@type": "ImageObject",
    url: absolute(picture.src),
    ...mediaSize(picture.src),
  };
}

/** The trail of pages leading to this one, e.g. Home > Destinations > Tokyo. */
export function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

/** Removes empty values so the output only states what is known. */
export function tidy<T>(value: T): T {
  if (Array.isArray(value))
    return value
      .map(tidy)
      .filter((v) => v !== undefined && v !== null && v !== "") as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      const cleaned = tidy(v);
      if (
        cleaned === undefined ||
        cleaned === null ||
        cleaned === "" ||
        (Array.isArray(cleaned) && !cleaned.length)
      )
        continue;
      out[key] = cleaned;
    }
    return out as T;
  }
  return value;
}

export { absolute };
