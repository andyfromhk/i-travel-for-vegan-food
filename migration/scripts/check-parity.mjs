// Compares the new build (dist/) with what the live Webflow site served (migration/crawl/pages.json).
//
// For every URL in the old sitemap it checks that the new site either
//   - has a page at the same address with the same title and meta description, or
//   - redirects that address on purpose (public/_redirects).
// It also checks that every internal link in the new build leads somewhere, and that the
// table-of-contents anchors of every foodie guide are the same as before.
//
// Run after `npm run build`:  node migration/scripts/check-parity.mjs
// The result is written to docs/parity-report.md.

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const crawl = JSON.parse(await readFile("migration/crawl/pages.json", "utf8"));
const read = (file) => readFile(file, "utf8").catch(() => null);
const fileFor = (urlPath) =>
  urlPath === "/" ? "dist/index.html" : `dist${urlPath}.html`;

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
const title = (html) =>
  decode((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
const description = (html) => {
  const tag =
    (html.match(/<meta\b[^>]*name="description"[^>]*>/i) || [])[0] || "";
  return decode((tag.match(/content="([^"]*)"/i) || [])[1] || "");
};

// ---------- redirects ----------
const redirects = new Map();
const wildcards = [];
for (const line of ((await read("public/_redirects")) || "").split("\n")) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [source, target] = line.split(/\s+/);
  if (source.includes("*")) wildcards.push([source.replace("*", ""), target]);
  else redirects.set(source, target);
}
const redirectFor = (urlPath) =>
  redirects.get(urlPath) ??
  (wildcards.find(([prefix]) => urlPath.startsWith(prefix)) || [])[1];

// ---------- 1. every old URL ----------
const missing = [];
const titleDiffs = [];
const descriptionDiffs = [];
const redirected = [];
const redirectDiffs = [];
let same = 0;

for (const page of crawl.pages) {
  if (page.status === 200) {
    const html = await read(fileFor(page.path));
    if (!html) {
      const target = redirectFor(page.path);
      if (target) redirected.push(`${page.path} → ${target}`);
      else missing.push(page.path);
      continue;
    }
    const newTitle = title(html);
    const newDescription = description(html);
    let ok = true;
    if (newTitle !== (page.title || "")) {
      titleDiffs.push({ path: page.path, old: page.title, new: newTitle });
      ok = false;
    }
    // Runs of spaces are ignored: browsers and search engines collapse them anyway.
    const squash = (value) => value.replace(/\s+/g, " ").trim();
    if (
      page.description &&
      squash(newDescription) !== squash(page.description)
    ) {
      descriptionDiffs.push({
        path: page.path,
        old: page.description,
        new: newDescription,
      });
      ok = false;
    }
    if (ok) same++;
  } else if (page.status >= 300 && page.status < 400) {
    const target = redirectFor(page.path);
    const oldTarget = (page.location || "").replace(crawl.origin, "") || "/";
    if (!target) {
      if (await read(fileFor(page.path)))
        redirectDiffs.push(
          `${page.path}: redirected to ${oldTarget} before, is a page now`,
        );
      else missing.push(`${page.path} (redirected to ${oldTarget} before)`);
    } else if (target !== oldTarget)
      redirectDiffs.push(`${page.path}: was → ${oldTarget}, now → ${target}`);
    else same++;
  }
}

// ---------- 2. internal links ----------
async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name !== "media" &&
        entry.name !== "_astro" &&
        entry.name !== "site"
      )
        out.push(...(await htmlFiles(full)));
    } else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}
const files = await htmlFiles("dist");
const built = new Set(
  files.map((file) => "/" + file.slice(5, -5).replace(/^index$/, "")),
);
built.add("/");
const broken = new Map();
let linkCount = 0;
const remoteImages = new Set();
for (const file of files) {
  const html = await readFile(file, "utf8");
  const from = "/" + file.slice(5, -5).replace(/^index$/, "");
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) {
    const href = decode(match[1]);
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    linkCount++;
    const target = href
      .split("#")[0]
      .split("?")[0]
      .replace(/(.)\/$/, "$1");
    if (/\.(webp|jpe?g|png|gif|svg|avif|ico|xml|txt|pdf)$/i.test(target))
      continue;
    if (!built.has(target) && !redirectFor(target))
      broken.set(href, [...(broken.get(href) || []), from]);
  }
  for (const match of html.matchAll(
    /(?:src|href)="(https?:\/\/(?:cdn\.prod\.website-files\.com|uploads-ssl\.webflow\.com)[^"]*)"/g,
  ))
    remoteImages.add(match[1]);
}

// ---------- 3. table-of-contents anchors of foodie guides ----------
// The old site built each anchor from the heading's HTML with this recipe (see the old guide.js).
const oldId = (inner) =>
  inner
    .replace(/\s+/g, "-")
    .replace(/[°&/\\#,+()$~%.'":;*?<>{}]/g, "")
    .toLowerCase();
function oldAnchors(html) {
  const start = html.indexOf('id="content"');
  if (start === -1) return [];
  const end = html.indexOf('class="guide-author-box', start);
  const content = html.slice(start, end === -1 ? undefined : end);
  const used = new Set();
  const ids = [];
  for (const match of content.matchAll(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/g)) {
    // A browser reports quotes and apostrophes as themselves (only & < > stay encoded), and the recipe ran in a browser.
    const base = oldId(
      match[2].replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"'),
    );
    if (!base) continue;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    ids.push(id);
  }
  return ids;
}
const aliases = JSON.parse(
  (await read("src/data/anchor-aliases.json")) || "{}",
);
const anchorDiffs = [];
let anchorsChecked = 0;
for (const page of crawl.pages) {
  if (!page.path.startsWith("/articles/") || page.status !== 200) continue;
  const oldHtml = await read(`migration/crawl/html${page.path}.html`);
  const newHtml = await read(fileFor(page.path));
  if (!oldHtml || !newHtml) continue;
  const before = oldAnchors(oldHtml);
  const after = new Set(
    [...newHtml.matchAll(/<h[1-6]\b[^>]*\bid="([^"]+)"/g)].map((m) =>
      decode(m[1]),
    ),
  );
  anchorsChecked += before.length;
  // An old anchor also counts as kept when the page redirects it to its new name (src/data/anchor-aliases.json).
  const lost = before.filter(
    (id) => !after.has(id) && !(aliases[page.path] || {})[id],
  );
  if (lost.length) anchorDiffs.push({ path: page.path, lost });
}

// ---------- report ----------
const lines = [
  "# Parity report",
  "",
  "Written by `migration/scripts/check-parity.mjs`. Re-run it after a build to refresh this file.",
  "",
];
lines.push("## Old URLs", "");
lines.push(`- URLs in the old sitemap: **${crawl.pages.length}**`);
lines.push(
  `- Same address, same title and description (or the same redirect) on the new site: **${same}**`,
);
lines.push(`- Redirected on purpose: **${redirected.length}**`);
lines.push(`- Missing: **${missing.length}**`);
lines.push(
  `- Title differs: **${titleDiffs.length}**, description differs: **${descriptionDiffs.length}**`,
  "",
);
if (redirected.length)
  lines.push(
    "### Redirected on purpose",
    "",
    ...redirected.map((r) => `- ${r}`),
    "",
  );
if (missing.length)
  lines.push("### Missing", "", ...missing.map((m) => `- ${m}`), "");
if (redirectDiffs.length)
  lines.push(
    "### Redirects that changed",
    "",
    ...redirectDiffs.map((m) => `- ${m}`),
    "",
  );
if (titleDiffs.length) {
  lines.push("### Titles that differ", "");
  for (const d of titleDiffs)
    lines.push(`- \`${d.path}\``, `  - before: ${d.old}`, `  - now: ${d.new}`);
  lines.push("");
}
if (descriptionDiffs.length) {
  lines.push("### Descriptions that differ", "");
  for (const d of descriptionDiffs)
    lines.push(`- \`${d.path}\``, `  - before: ${d.old}`, `  - now: ${d.new}`);
  lines.push("");
}
lines.push("## Internal links", "");
lines.push(
  `- Pages in the new build: **${files.length}**, internal links checked: **${linkCount}**`,
);
lines.push(`- Links that lead nowhere: **${broken.size}**`, "");
for (const [href, from] of broken)
  lines.push(
    `- \`${href}\` (linked from ${[...new Set(from)].slice(0, 3).join(", ")}${new Set(from).size > 3 ? ", …" : ""})`,
  );
if (broken.size) lines.push("");
lines.push("## Table-of-contents anchors", "");
lines.push(
  `- Anchors on the old foodie guides: **${anchorsChecked}**, missing on the new site: **${anchorDiffs.reduce((n, d) => n + d.lost.length, 0)}**`,
  "",
);
for (const d of anchorDiffs)
  lines.push(`- \`${d.path}\`: ${d.lost.map((id) => `#${id}`).join(", ")}`);
if (anchorDiffs.length) lines.push("");
lines.push(
  "## Images still loaded from Webflow",
  "",
  `- **${remoteImages.size}**`,
  "",
);
for (const url of [...remoteImages].slice(0, 20)) lines.push(`- ${url}`);
await writeFile("docs/parity-report.md", lines.join("\n") + "\n");

console.log(
  `Old URLs: ${crawl.pages.length} | same: ${same} | redirected on purpose: ${redirected.length} | missing: ${missing.length}`,
);
console.log(
  `Titles differ: ${titleDiffs.length} | descriptions differ: ${descriptionDiffs.length} | redirects changed: ${redirectDiffs.length}`,
);
console.log(
  `Internal links: ${linkCount} checked, ${broken.size} broken | TOC anchors: ${anchorsChecked} checked, ${anchorDiffs.reduce((n, d) => n + d.lost.length, 0)} missing | Webflow images: ${remoteImages.size}`,
);
