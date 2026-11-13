// Converts the rich text of the two static pages that have long copy (About and Privacy Policy)
// from the crawled HTML into Markdown files under src/content/pages/.
//
// Run:  node migration/scripts/convert-pages.mjs

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { richTextToMarkdown } from "./lib/richtext.mjs";

const ctx = {
  media: (url) => url,
  alt: (url, alt) => alt || "",
  place: () => "",
  warn: (m) => console.warn(m),
  figures: [],
};

// Returns the inner HTML of the nth <div class="…w-richtext…"> block.
function richTextBlocks(html) {
  const blocks = [];
  const open = /<div[^>]*class="[^"]*w-richtext[^"]*"[^>]*>/g;
  let match;
  while ((match = open.exec(html))) {
    let depth = 1;
    let i = open.lastIndex;
    const tag = /<(\/?)div\b[^>]*>/g;
    tag.lastIndex = i;
    let t;
    while (depth && (t = tag.exec(html))) depth += t[1] ? -1 : 1;
    blocks.push(html.slice(i, t.index));
  }
  return blocks;
}

// Cloudflare hides email addresses in the published HTML; this turns them back into normal mailto links.
function restoreEmails(markdown) {
  return markdown.replace(
    /\[(?:\\.|[^\]\\])*\]\(\/cdn-cgi\/l\/email-protection#([0-9a-f]+)\)/gi,
    (_, hex) => {
      const key = parseInt(hex.slice(0, 2), 16);
      let email = "";
      for (let i = 2; i < hex.length; i += 2)
        email += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
      return `[${email}](mailto:${email})`;
    },
  );
}

await mkdir("src/content/pages", { recursive: true });

const about = await readFile("migration/crawl/html/about.html", "utf8");
await writeFile(
  "src/content/pages/about.md",
  `---\ntitle: About & Contact - I Travel For Vegan Food\ndescription: "I Travel For Vegan Food mission is simple: Make planning your vegan food adventures as easy and exciting as possible."\n---\n\n${richTextToMarkdown(richTextBlocks(about)[0], ctx)}\n`,
);

const privacy = await readFile(
  "migration/crawl/html/privacy-policy.html",
  "utf8",
);
const body = richTextBlocks(privacy).sort((a, b) => b.length - a.length)[0];
await writeFile(
  "src/content/pages/privacy-policy.md",
  `---\ntitle: Privacy Policy\ndescription: Privacy Policy of I Travel For Vegan Food\n---\n\n${restoreEmails(richTextToMarkdown(body, ctx))}\n`,
);
console.log("about.md and privacy-policy.md written");
