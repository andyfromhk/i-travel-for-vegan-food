// Crawls every URL in the live site's sitemap and records what search engines see on each page:
// status, title, meta description, canonical, Open Graph tags, JSON-LD and the H1.
//
// The result (migration/crawl/pages.json) is the "before" picture the new site is checked against.
// The raw HTML is also kept in migration/crawl/html/ (not committed) for anything else we need to look up.
//
// Run:  node migration/scripts/crawl-live.mjs
// It is polite: 4 pages at a time, with a short pause between requests.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ORIGIN = "https://www.itravelforveganfood.com";
const OUT_DIR = "migration/crawl";
const HTML_DIR = path.join(OUT_DIR, "html");
const CONCURRENCY = 4;
const PAUSE_MS = 150;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "itfvf-migration-crawl/1.0" } });
      const body = res.status === 200 ? await res.text() : "";
      return { status: res.status, location: res.headers.get("location"), body };
    } catch (error) {
      if (attempt === 3) return { status: 0, error: String(error), body: "" };
      await sleep(1000 * attempt);
    }
  }
}

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

// Reads a <meta> tag whichever order its attributes come in.
function meta(html, key, value) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const k = tag.match(new RegExp(`\\b${key}="([^"]*)"`, "i"));
    if (k && k[1].toLowerCase() === value.toLowerCase()) {
      const content = tag.match(/\bcontent="([^"]*)"/i);
      return content ? decode(content[1]) : "";
    }
  }
  return null;
}

function extract(html) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*>/i);
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const jsonLd = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => {
    try {
      return JSON.parse(m[1]);
    } catch {
      return { _unparsed: m[1].trim() };
    }
  });
  return {
    title: title ? decode(title[1].trim()) : null,
    description: meta(html, "name", "description"),
    robots: meta(html, "name", "robots"),
    canonical: canonical ? (canonical[0].match(/href="([^"]*)"/i) || [])[1] || null : null,
    ogTitle: meta(html, "property", "og:title"),
    ogDescription: meta(html, "property", "og:description"),
    ogImage: meta(html, "property", "og:image"),
    ogType: meta(html, "property", "og:type"),
    twitterCard: meta(html, "name", "twitter:card") ?? meta(html, "property", "twitter:card"),
    twitterTitle: meta(html, "property", "twitter:title") ?? meta(html, "name", "twitter:title"),
    twitterImage: meta(html, "property", "twitter:image") ?? meta(html, "name", "twitter:image"),
    h1: h1 ? decode(h1[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : null,
    jsonLd,
  };
}

const sitemap = await get(`${ORIGIN}/sitemap.xml`);
const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
console.log(`${urls.length} URLs in the sitemap`);

await mkdir(HTML_DIR, { recursive: true });
const pages = [];
let next = 0;

async function worker() {
  while (next < urls.length) {
    const url = urls[next++];
    const pathname = new URL(url).pathname;
    const res = await get(url);
    const record = { path: pathname, status: res.status };
    if (res.location) record.location = res.location;
    if (res.error) record.error = res.error;
    if (res.body) {
      Object.assign(record, extract(res.body));
      const file = path.join(HTML_DIR, (pathname === "/" ? "/index" : pathname) + ".html");
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, res.body);
    }
    pages.push(record);
    if (pages.length % 50 === 0) console.log(`  ${pages.length} / ${urls.length}`);
    await sleep(PAUSE_MS);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
pages.sort((a, b) => a.path.localeCompare(b.path));

await writeFile(
  path.join(OUT_DIR, "pages.json"),
  JSON.stringify({ crawledAt: new Date().toISOString(), origin: ORIGIN, count: pages.length, pages }, null, 1),
);

const bad = pages.filter((p) => p.status !== 200);
console.log(`Done. ${pages.length - bad.length} returned 200, ${bad.length} did not.`);
for (const p of bad) console.log(`  ${p.status} ${p.path}${p.location ? " -> " + p.location : ""}`);
