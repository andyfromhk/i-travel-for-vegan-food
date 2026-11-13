// A few headings got a slightly different anchor on the new site (a trailing dash dropped, a line break
// removed). So links people shared to those sections keep working, this writes src/data/anchor-aliases.json:
// for each foodie guide, the old anchors that changed and the new anchor each one now means.
// The guide page reads that file and quietly sends an old anchor to the new one.
//
// Run after `npm run build`:  node migration/scripts/build-anchor-aliases.mjs   (then build once more)

import { readFile, writeFile } from "node:fs/promises";

const crawl = JSON.parse(await readFile("migration/crawl/pages.json", "utf8"));
const read = (file) => readFile(file, "utf8").catch(() => null);

// The old site's recipe (it ran in the browser, on the heading's HTML).
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

function newAnchors(html) {
  const start = html.indexOf('id="content"');
  const end = html.indexOf('class="author-box_wrap"', start);
  const content = html.slice(start, end === -1 ? undefined : end);
  return [...content.matchAll(/<h[23]\b[^>]*\bid="([^"]+)"/g)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
}

const aliases = {};
const unresolved = [];
for (const page of crawl.pages) {
  if (!page.path.startsWith("/articles/") || page.status !== 200) continue;
  const oldHtml = await read(`migration/crawl/html${page.path}.html`);
  const newHtml = await read(`dist${page.path}.html`);
  if (!oldHtml || !newHtml) continue;
  const before = oldAnchors(oldHtml);
  const after = newAnchors(newHtml);
  const kept = new Set(after);
  const changed = before.filter((id) => !kept.has(id));
  if (!changed.length) continue;
  // Headings are in the same order on both sites, so the anchors that changed pair up by position
  // among the anchors that don't match on either side.
  const stillOld = new Set(before);
  const fresh = after.filter((id) => !stillOld.has(id));
  if (fresh.length === changed.length) {
    aliases[page.path] = Object.fromEntries(
      changed.map((id, index) => [id, fresh[index]]),
    );
  } else {
    // Otherwise pair the ones that are plainly the same heading (the old anchor starts with the new one).
    const pairs = changed
      .map((id) => [
        id,
        fresh.find(
          (f) => id.startsWith(f) || f.startsWith(id.replace(/-+$/, "")),
        ),
      ])
      .filter(([, f]) => f);
    if (pairs.length) aliases[page.path] = Object.fromEntries(pairs);
    const left = changed.filter((id) => !pairs.some(([p]) => p === id));
    if (left.length) unresolved.push(`${page.path}: ${left.join(", ")}`);
  }
}

await writeFile(
  "src/data/anchor-aliases.json",
  JSON.stringify(aliases, null, 2) + "\n",
);
const total = Object.values(aliases).reduce(
  (n, map) => n + Object.keys(map).length,
  0,
);
console.log(
  `${total} old anchors mapped across ${Object.keys(aliases).length} guides`,
);
for (const line of unresolved) console.log(`  not mapped: ${line}`);
