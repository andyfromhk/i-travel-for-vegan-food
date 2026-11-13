import { NOINDEX_ROUTES } from "../consts.ts";

/**
 * The public address of a page, as readers see it: "/articles/vegan-tokyo-guide", "/about", "/".
 * While the site is built, Astro.url.pathname ends in the file it writes ("/about.html", "/index.html"),
 * so links, canonical addresses and "current page" checks all go through this.
 */
export function pagePath(pathname: string): string {
  return (
    pathname
      .replace(/(^|\/)index\.html$/, "$1")
      .replace(/\.html$/, "")
      .replace(/\/+$/, "") || "/"
  );
}

const normalize = (path: string) => `/${path.replace(/^\/+|\/+$/g, "")}`;

const excluded = new Set(NOINDEX_ROUTES.map(normalize));

/** Checks whether a route should be hidden from search. Used by BaseHead. */
export function isNoindexRoute(pathname: string): boolean {
  return excluded.has(normalize(pagePath(pathname)));
}
