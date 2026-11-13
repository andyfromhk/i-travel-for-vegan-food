// Finishing touches applied to every piece of Markdown when the site is built:
//
//   - a photo on its own line becomes a <figure>; an italic line directly under it becomes its caption
//   - two portrait photos in a row sit side by side
//   - a block quote becomes a tip box; an emoji at its start picks the icon (see docs/writing-guide.md)
//   - headings get the same ids the old site used, so links people shared (…#where-to-stay) still work
//   - links to other websites open in a new tab

import type { Element, ElementContent, Root, RootContent } from "hast";
import type { VFile } from "vfile";
import { sizeOf } from "../utils/media-size.ts";

// Emoji that choose a tip's icon. No emoji means the light bulb.
const TIP_ICONS: [string, string][] = [
  ["💡", "idea"],
  ["📷", "camera"],
  ["📸", "camera"],
  ["🎫", "ticket"],
  ["🎟", "ticket"],
  ["🚆", "ticket"],
  ["🚄", "ticket"],
  ["🧭", "compass"],
  ["🍜", "food"],
  ["🍱", "food"],
  ["🌐", "website"],
  ["📍", "location"],
  ["🏨", "hotel"],
  ["🛏", "hotel"],
  ["🍴", "cutlery"],
  ["🍽", "cutlery"],
  ["📖", "book"],
  ["📚", "book"],
  ["💰", "money"],
  ["💴", "money"],
  ["💵", "money"],
  ["🏷", "discount"],
  ["📱", "phone-heart"],
];

const isElement = (node: unknown, tag?: string): node is Element =>
  !!node &&
  (node as Element).type === "element" &&
  (!tag || (node as Element).tagName === tag);
const isBlank = (node: RootContent | ElementContent) =>
  node.type === "text" && !node.value.trim();
const meaningful = (node: Element) =>
  node.children.filter((child) => !isBlank(child));
const h = (
  tagName: string,
  properties: Element["properties"],
  children: ElementContent[] = [],
): Element => ({
  type: "element",
  tagName,
  properties,
  children,
});

function textOf(node: ElementContent | Root): string {
  if (node.type === "text") return node.value;
  return "children" in node
    ? (node.children as ElementContent[]).map(textOf).join("")
    : "";
}

// The heading's HTML as a browser reports it (innerHTML). The old table-of-contents recipe built ids from this.
function innerHtml(node: ElementContent): string {
  if (node.type === "text")
    return node.value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/ /g, "&nbsp;");
  if (node.type !== "element") return "";
  const attrs =
    node.tagName === "a" && node.properties.href
      ? ` href="${node.properties.href}"`
      : "";
  return `<${node.tagName}${attrs}>${node.children.map(innerHtml).join("")}</${node.tagName}>`;
}
const tocId = (heading: Element) =>
  heading.children
    .map(innerHtml)
    .join("")
    .replace(/\s+/g, "-")
    .replace(/[°&/\\#,+()$~%.'":;*?<>{}]/g, "")
    .toLowerCase();

// "Taro's Ramen & Bar" -> "taros-ramen-and-bar": the recipe the save buttons use for a place's anchor.
const slugify = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function figureFrom(img: Element, link?: Element): Element {
  const src = String(img.properties.src ?? "");
  const size = sizeOf(src);
  img.properties.loading = "lazy";
  img.properties.decoding = "async";
  img.properties.alt = img.properties.alt ?? "";
  let orientation = "landscape";
  if (size) {
    img.properties.width = size[0];
    img.properties.height = size[1];
    if (size[1] > size[0] * 1.05) orientation = "portrait";
    else if (size[1] >= size[0] * 0.95) orientation = "square";
  }
  return h("figure", { className: ["figure"], dataOrientation: orientation }, [
    link ?? img,
  ]);
}

// A paragraph holding only photos (each may be wrapped in a link) gives back those photos; anything else gives nothing.
function photosIn(node: Element): { img: Element; link?: Element }[] {
  if (node.tagName !== "p") return [];
  const out: { img: Element; link?: Element }[] = [];
  for (const child of meaningful(node)) {
    if (isElement(child, "img")) out.push({ img: child });
    else if (
      isElement(child, "a") &&
      meaningful(child).length === 1 &&
      isElement(meaningful(child)[0], "img")
    )
      out.push({ img: meaningful(child)[0] as Element, link: child });
    else if (isElement(child, "br")) continue;
    else return [];
  }
  return out;
}

const isCaption = (node: RootContent | undefined): node is Element =>
  isElement(node, "p") &&
  meaningful(node).length === 1 &&
  isElement(meaningful(node)[0], "em");

function tipFrom(quote: Element): Element {
  let icon = "idea";
  const first = firstText(quote);
  if (first) {
    const value = first.value.replace(/^[\s​-‍﻿]+/, "");
    const match = TIP_ICONS.find(([emoji]) => value.startsWith(emoji));
    if (match) {
      icon = match[1];
      first.value = value
        .slice(match[0].length)
        .replace(/^️/, "")
        .replace(/^\s+/, "");
    }
  }
  return h("div", { className: ["tip"], dataIcon: icon }, [
    h("span", { className: ["tip_icon"], ariaHidden: "true" }),
    h("div", { className: ["tip_body"] }, quote.children),
  ]);
}

function firstText(node: Element): { type: "text"; value: string } | undefined {
  for (const child of node.children) {
    if (child.type === "text" && child.value.trim()) return child;
    if (isElement(child)) {
      const found = firstText(child);
      if (found) return found;
    }
  }
  return undefined;
}

function eachElement(node: Root | Element, fn: (el: Element) => void) {
  for (const child of node.children) {
    if (isElement(child)) {
      fn(child);
      eachElement(child, fn);
    }
  }
}

export function rehypeEnhance() {
  return (tree: Root, file: VFile) => {
    const filePath = String(file.path ?? "").replace(/\\/g, "/");
    const kind = filePath.includes("/guides/articles/")
      ? "article"
      : filePath.includes("/guides/map-guides/")
        ? "map-guide"
        : "other";

    // 1. Photos, captions and tips
    const blocks: RootContent[] = [];
    const source = tree.children.filter((node) => !isBlank(node));
    for (let i = 0; i < source.length; i++) {
      const node = source[i];
      if (!isElement(node)) {
        blocks.push(node);
        continue;
      }
      const photos = photosIn(node);
      if (photos.length) {
        const figures = photos.map(({ img, link }) => figureFrom(img, link));
        if (isCaption(source[i + 1])) {
          const em = meaningful(source[i + 1] as Element)[0] as Element;
          figures[figures.length - 1].children.push(
            h("figcaption", {}, em.children),
          );
          i++;
        }
        if (figures.length > 1)
          blocks.push(h("div", { className: ["image-pair"] }, figures));
        else blocks.push(figures[0]);
        continue;
      }
      if (node.tagName === "blockquote") {
        blocks.push(tipFrom(node));
        continue;
      }
      blocks.push(node);
    }

    // 2. Two portrait photos in a row sit side by side
    const paired: RootContent[] = [];
    const portrait = (node: RootContent | undefined): node is Element =>
      isElement(node, "figure") &&
      node.properties.dataOrientation === "portrait";
    for (let i = 0; i < blocks.length; i++) {
      const [a, b] = [blocks[i], blocks[i + 1]];
      if (portrait(a) && portrait(b)) {
        paired.push(h("div", { className: ["image-pair"] }, [a, b]));
        i++;
      } else paired.push(a);
    }
    tree.children = paired;

    // 3. Heading ids
    if (kind !== "other") {
      const used = new Set<string>();
      const claim = (base: string) => {
        if (!base) return undefined;
        let id = base;
        for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
        used.add(id);
        return id;
      };
      const headings: Element[] = [];
      eachElement(tree, (el) => {
        if (/^h[1-6]$/.test(el.tagName)) headings.push(el);
      });
      // Articles: h2 and h3 feed the table of contents and keep its recipe. Those are claimed first, as the old script did.
      if (kind === "article") {
        for (const heading of headings)
          if (/^h[23]$/.test(heading.tagName))
            heading.properties.id = claim(tocId(heading));
      }
      for (const heading of headings) {
        if (!heading.properties.id)
          heading.properties.id = claim(slugify(textOf(heading)));
      }
    }

    // 4. Links to other sites open in a new tab
    eachElement(tree, (el) => {
      if (el.tagName !== "a") return;
      const href = String(el.properties.href ?? "");
      if (
        /^https?:\/\//i.test(href) &&
        !/^https?:\/\/(www\.)?itravelforveganfood\.com/i.test(href)
      ) {
        el.properties.target = "_blank";
        el.properties.rel = ["noopener"];
      }
    });
  };
}
