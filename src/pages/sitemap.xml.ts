// The sitemap, at the same address as before (/sitemap.xml), listing every page the site builds.

import type { APIRoute } from "astro";
import { getSite, guideUrl, hasPage, placeUrl } from "@/utils/content.ts";

export const GET: APIRoute = async ({ site }) => {
  const { places, destinations, guides, authors } = await getSite();
  const entries: { path: string; updated?: Date }[] = [
    { path: "/" },
    { path: "/destinations" },
    { path: "/articles" },
    { path: "/shop" },
    { path: "/about" },
    { path: "/privacy-policy" },
    ...destinations.map((d) => ({ path: `/destinations/${d.id}`, updated: d.data.updated })),
    ...guides.map((g) => ({ path: guideUrl(g), updated: g.data.updated })),
    ...places.filter(hasPage).map((p) => ({ path: placeUrl(p), updated: p.data.updated })),
    ...authors.map((a) => ({ path: `/authors/${a.id}` })),
  ];

  const urls = entries
    .map(({ path, updated }) => {
      const loc = new URL(path, site).href.replace(/\/$/, path === "/" ? "/" : "");
      const lastmod = updated ? `<lastmod>${updated.toISOString().slice(0, 10)}</lastmod>` : "";
      return `  <url><loc>${loc}</loc>${lastmod}</url>`;
    })
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
