// Turns Webflow rich text (HTML) into clean Markdown.
//
// What it handles:
//   - headings, paragraphs, bold/italic, links, lists, line breaks
//   - figures: the image, then its caption as an italic line directly underneath
//   - old shortcodes:  [.divider][.divider]  ->  ---
//                      [.tips][.icon-x][.icon-x][.div]text[.div][.tips]  ->  > 🧭 text   (a block quote = tip box)
//   - map guide embeds: place markers, route blocks and end-of-day messages -> {{place: …}}, {{route: …}}, {{end-of-day: …}}
//   - other embeds: Google Maps iframes -> {{map: url}}, the hotel search widget -> {{hotels: Area}}
//   - Webflow's empty spacer paragraphs are dropped (the new site spaces paragraphs with CSS)

import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { toString as hastText } from "hast-util-to-string";

const INVISIBLE = /[​-‍﻿]/g;
const SITE = /^https?:\/\/(www\.)?itravelforveganfood\.com/i;

// The emoji that picks each tip icon (same list as docs/writing-guide.md). The light bulb is the default, so it needs none.
export const TIP_EMOJI = {
  idea: "",
  camera: "📷",
  ticket: "🎫",
  compass: "🧭",
  food: "🍜",
  website: "🌐",
  location: "📍",
  hotel: "🏨",
  cutlery: "🍴",
  book: "📖",
  money: "💰",
  discount: "🏷️",
  "phone-heart": "📱",
};

const el = (tagName, properties = {}, children = []) => ({
  type: "element",
  tagName,
  properties,
  children,
});
const text = (value) => ({ type: "text", value });
const raw = (value) => el("vt-raw", { value });
const isEl = (node, tag) =>
  node && node.type === "element" && (!tag || node.tagName === tag);
const classes = (node) => (node.properties && node.properties.className) || [];

function find(node, test) {
  if (test(node)) return node;
  for (const child of node.children || []) {
    const hit = find(child, test);
    if (hit) return hit;
  }
  return null;
}

function walkText(node, fn) {
  for (const child of node.children || []) {
    if (child.type === "text") child.value = fn(child.value);
    else walkText(child, fn);
  }
}

const cleanText = (node) =>
  hastText(node)
    .replace(INVISIBLE, "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();

function isEmptyParagraph(node) {
  if (!isEl(node, "p")) return false;
  if (find(node, (n) => isEl(n, "img") || isEl(n, "iframe"))) return false;
  return cleanText(node) === "";
}

/**
 * @param {string} html  Webflow rich text
 * @param {object} ctx
 *   media(url)            -> local path for an image
 *   alt(url, alt)         -> the alt text to keep
 *   place(data, heading)  -> the text to put inside {{place: …}} for a map guide marker
 *   warn(message)
 *   figures               -> array that collects { src, align } for every figure (used to study image pairs)
 */
export function richTextToMarkdown(html, ctx) {
  if (!html || !html.trim()) return "";
  const tree = unified().use(rehypeParse, { fragment: true }).parse(html);

  // Which restaurant pages each section links to (a section runs from one heading to the next).
  // Map guide markers use this to find the restaurant they belong to.
  const linksOf = new Map();
  let section = [];
  for (const node of tree.children) {
    if (isEl(node) && /^h[1-6]$/.test(node.tagName)) section = [];
    linksOf.set(node, section);
    collectRestaurantLinks(node, section);
  }

  let lastHeading = null;
  const out = [];

  for (const node of tree.children) {
    if (node.type === "text") {
      if (node.value.trim()) out.push(el("p", {}, [node]));
      continue;
    }
    if (!isEl(node)) continue;

    if (/^h[1-6]$/.test(node.tagName)) {
      lastHeading = node;
      out.push(node);
      continue;
    }

    if (isEl(node, "figure")) {
      out.push(...figure(node, ctx));
      continue;
    }

    if (
      isEl(node, "div") &&
      node.properties &&
      "dataRtEmbedType" in node.properties
    ) {
      out.push(...embed(node, ctx, lastHeading, linksOf.get(node) || []));
      continue;
    }

    if (isEl(node, "p")) {
      if (isEmptyParagraph(node)) continue;
      const plain = cleanText(node);
      if (
        /^(\[\.divider\]\s*\[\.divider\]|-{3,}|\*{3,}|_{3,}|—{2,})$/.test(plain)
      ) {
        out.push(el("hr"));
        continue;
      }
      if (plain.startsWith("[.tips]")) {
        out.push(oldTip(node, ctx));
        continue;
      }
      if (/\[[.#$][\w-]+/.test(plain))
        ctx.warn(`Unconverted shortcode in: "${plain.slice(0, 80)}"`);
      out.push(node);
      continue;
    }

    out.push(node);
  }

  tree.children = out;
  normalise(tree);

  const mdast = unified()
    .use(rehypeRemark, {
      handlers: {
        "vt-raw": (state, node) => ({
          type: "html",
          value: node.properties.value,
        }),
      },
    })
    .runSync(tree);
  hoistEdges(mdast);

  return unified()
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet: "-",
      emphasis: "*",
      strong: "*",
      rule: "-",
      listItemIndent: "one",
    })
    .stringify(mdast)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Webflow often puts a space or a line break just inside bold, italic or link text ("<em>Hours:<br></em>").
// Markdown can't write that cleanly, so the converter would escape it as "*Hours:\\&#xA;*&#x4C;unch".
// This moves those spaces and breaks just outside, and drops any bold, italic or link left empty.
function hoistEdges(node) {
  if (!node.children) return;
  node.children.forEach(hoistEdges);
  const out = [];
  for (const child of node.children) {
    if (!["emphasis", "strong", "delete", "link"].includes(child.type)) {
      out.push(child);
      continue;
    }
    const before = [];
    const after = [];
    const kids = child.children;
    while (kids.length && kids[0].type === "break") before.push(kids.shift());
    while (kids.length && kids.at(-1).type === "break")
      after.unshift(kids.pop());
    const first = kids[0];
    const last = kids.at(-1);
    if (
      first &&
      first.type === "text" &&
      /^[\s\u2028\u2029]/.test(first.value)
    ) {
      first.value = first.value.replace(/^[\s\u2028\u2029]+/, "");
      before.push({ type: "text", value: " " });
    }
    if (last && last.type === "text" && /[\s\u2028\u2029]$/.test(last.value)) {
      last.value = last.value.replace(/[\s\u2028\u2029]+$/, "");
      after.unshift({ type: "text", value: " " });
    }
    child.children = kids.filter((kid) => kid.type !== "text" || kid.value);
    const empty = !child.children.length;
    out.push(...before, ...(empty ? [] : [child]), ...after);
  }
  // A space next to a line break, or at either end of a paragraph or heading, is invisible, so drop it.
  const block = ["paragraph", "heading", "tableCell"].includes(node.type);
  node.children = out.filter(
    (kid, i) =>
      !(
        kid.type === "text" &&
        kid.value === " " &&
        (out[i - 1]?.type === "break" ||
          out[i + 1]?.type === "break" ||
          (block && (i === 0 || i === out.length - 1)))
      ),
  );
}

// Tidies text and links everywhere.
function normalise(node) {
  for (const child of node.children || []) {
    if (child.type === "text") {
      child.value = child.value.replace(INVISIBLE, "").replace(/ /g, " ");
    } else if (isEl(child)) {
      if (
        child.tagName === "a" &&
        child.properties &&
        typeof child.properties.href === "string"
      ) {
        child.properties.href = cleanHref(child.properties.href);
      }
      normalise(child);
    }
  }
}

// Internal links become site-relative (/articles/…) so they work on any address the site is served from.
export function cleanHref(href) {
  const trimmed = href.trim();
  if (SITE.test(trimmed)) return trimmed.replace(SITE, "") || "/";
  return trimmed;
}

function figure(node, ctx) {
  const img = find(node, (n) => isEl(n, "img"));
  const iframe = find(node, (n) => isEl(n, "iframe"));
  if (!img) {
    if (iframe)
      return [el("p", {}, [raw(`{{embed: ${iframe.properties.src}}}`)])];
    ctx.warn("Figure without an image was dropped");
    return [];
  }
  const src = String(img.properties.src || "");
  const align = String(node.properties.dataRtAlign || "");
  const local = ctx.media(src);
  const alt = ctx.alt(src, img.properties.alt);
  ctx.figures.push({ src: local, align });

  const link = find(node, (n) => isEl(n, "a") && find(n, (m) => m === img));
  const image = el("img", { src: local, alt });
  const result = [
    el("p", {}, [
      link
        ? el("a", { href: cleanHref(String(link.properties.href || "")) }, [
            image,
          ])
        : image,
    ]),
  ];

  const caption = find(node, (n) => isEl(n, "figcaption"));
  if (caption && cleanText(caption)) {
    // An italic line directly under a photo is its caption. Captions that were already italic stay as they are.
    const onlyEm = caption.children.filter(
      (c) => !(c.type === "text" && !c.value.replace(INVISIBLE, "").trim()),
    );
    const alreadyItalic = onlyEm.length === 1 && isEl(onlyEm[0], "em");
    result.push(
      el(
        "p",
        { dataCaption: "" },
        alreadyItalic ? onlyEm : [el("em", {}, unwrapEm(caption.children))],
      ),
    );
  }
  return result;
}

// Italics inside an italic caption would switch the text back to upright, so they are flattened.
function unwrapEm(children) {
  return children.flatMap((child) =>
    isEl(child, "em") ? unwrapEm(child.children) : [child],
  );
}

function oldTip(node, ctx) {
  const plain = cleanText(node);
  const icon = (plain.match(/\[\.icon-([\w-]+)\]/) || [])[1] || "idea";
  if (!(icon in TIP_EMOJI)) ctx.warn(`Unknown tip icon "${icon}"`);
  walkText(node, (value) => value.replace(/\[\.(tips|div|icon-[\w-]+)\]/g, ""));
  if (/\[\./.test(cleanText(node)))
    ctx.warn(`Tip box with leftover codes: "${cleanText(node).slice(0, 80)}"`);
  const emoji = TIP_EMOJI[icon];
  if (emoji) {
    const first = find(
      node,
      (n) => n.type === "text" && n.value.replace(INVISIBLE, "").trim(),
    );
    // The emoji goes right at the start; a space keeps it apart from the text.
    node.children.unshift(text(emoji + " "));
    if (first) first.value = first.value.replace(/^\s+/, "");
  }
  return el("blockquote", {}, [node]);
}

function collectRestaurantLinks(node, into) {
  if (isEl(node, "a") && typeof node.properties.href === "string") {
    const match = cleanHref(node.properties.href).match(
      /^\/restaurants\/([^/?#]+)/,
    );
    if (match && !into.includes(match[1])) into.push(match[1]);
  }
  for (const child of node.children || []) collectRestaurantLinks(child, into);
}

function embed(node, ctx, heading, linkedSlugs) {
  const trigger = find(
    node,
    (n) => isEl(n) && classes(n).includes("location-trigger"),
  );
  if (trigger) {
    const p = trigger.properties;
    const data = {
      lat: p.dataLat ? Number(p.dataLat) : null,
      lng: p.dataLng ? Number(p.dataLng) : null,
      district: p.dataDistrict ? String(p.dataDistrict).trim() : "",
      vegType: p.dataVegType ? String(p.dataVegType).trim() : "",
      priceRange: p.dataPriceRange ? String(p.dataPriceRange).trim() : "",
    };
    return [
      el("p", {}, [
        raw(
          `{{place: ${ctx.place(data, heading ? cleanText(heading) : "", linkedSlugs)}}}`,
        ),
      ]),
    ];
  }

  const route = find(node, (n) => isEl(n) && classes(n).includes("route-info"));
  if (route) {
    const info = String(route.properties.dataTravelInfo || "").trim();
    const mode = route.properties.dataTravelMode
      ? String(route.properties.dataTravelMode).trim()
      : "";
    const body =
      find(route, (n) => isEl(n) && classes(n).includes("route-info-text")) ||
      route;
    const head = `{{route: ${info}${mode ? ` [${mode}]` : ""} | `;
    return [el("p", {}, [raw(head), ...trimEnds(body.children), raw("}}")])];
  }

  const endOfDay = find(
    node,
    (n) => isEl(n) && classes(n).includes("end-of-day"),
  );
  if (endOfDay)
    return [
      el("p", {}, [
        raw("{{end-of-day: "),
        ...trimEnds(endOfDay.children),
        raw("}}"),
      ]),
    ];

  const iframe = find(node, (n) => isEl(n, "iframe"));
  if (
    iframe &&
    /google\.com\/maps\/embed/.test(String(iframe.properties.src))
  ) {
    return [el("p", {}, [raw(`{{map: ${iframe.properties.src}}}`)])];
  }

  const script = find(node, (n) => isEl(n, "script"));
  if (script && /tp\.media\/content/.test(String(script.properties.src))) {
    const url = new URL(String(script.properties.src));
    const expected = {
      trs: "286810",
      shmarker: "507446",
      promo_id: "2693",
      campaign_id: "84",
    };
    for (const [key, value] of Object.entries(expected)) {
      if (url.searchParams.get(key) !== value)
        ctx.warn(
          `Hotel widget with unexpected ${key}=${url.searchParams.get(key)}`,
        );
    }
    return [
      el("p", {}, [
        raw(`{{hotels: ${url.searchParams.get("default_direction") || ""}}}`),
      ]),
    ];
  }

  ctx.warn(
    `Embed kept as raw HTML: ${cleanText(node).slice(0, 60) || node.children.map((c) => c.tagName).join(",")}`,
  );
  return [node];
}

function trimEnds(children) {
  const list = children.map((c) => (c.type === "text" ? { ...c } : c));
  if (list[0] && list[0].type === "text")
    list[0].value = list[0].value.replace(/^\s+/, "");
  const last = list[list.length - 1];
  if (last && last.type === "text") last.value = last.value.replace(/\s+$/, "");
  return list;
}

// "Taro's Ramen & Bar" -> "taros-ramen-and-bar"  (the same recipe guide.js uses for saved-place ids)
export function slugify(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
