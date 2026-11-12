// Shortcodes: one-line codes you can type in a guide, written {{name: …}} on a line of their own.
//
//   {{place: vega-cafe}}                          a restaurant, by the last part of its URL. Its coordinates,
//                                                 area, veg type and price come from the restaurant's own record.
//   {{place: hai-hai | -27.48, 153.00 | West End}} the same restaurant, but pinned at another branch.
//   {{place: -27.46, 153.02 | Roma Street}}       a sight or stop that has no record: coordinates | area
//   {{place: 35.67, 139.76 | Ginza | Vegan | $$}} a food place that has no record yet: … | veg type | price
//   {{route: 15-minute walk | Head through the park towards Spring Hill.}}
//   {{end-of-day: That's day 1 done!}}
//   {{map: https://www.google.com/maps/embed?pb=…}}   an embedded Google Map
//   {{hotels: Hongdae}}                           the hotel search widget, opened on that area
//
// The build stops with a clear message when a {{place: …}} names a restaurant that doesn't exist,
// so a typo can never reach the live site.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { Root, Paragraph, PhrasingContent, RootContent } from "mdast";
import type { VFile } from "vfile";

interface PlaceInfo {
  name: string;
  chain?: boolean;
  district?: string;
  vegType?: string;
  priceRange?: string;
  location?: { lat: number; lng: number };
}

const ROOT = process.cwd();
let places: Map<string, PlaceInfo> | undefined;
let vegNames: Map<string, string>;
let priceSymbols: Map<string, string>;

function load() {
  if (places) return;
  const dir = path.join(ROOT, "src/content/places");
  places = new Map();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    const source = readFileSync(path.join(dir, file), "utf8");
    const end = source.indexOf("\n---", 3);
    places.set(file.slice(0, -3), YAML.parse(source.slice(3, end)) as PlaceInfo);
  }
  const taxonomies = JSON.parse(readFileSync(path.join(ROOT, "src/data/taxonomies.json"), "utf8"));
  vegNames = new Map(taxonomies.vegTypes.map((v: { slug: string; name: string }) => [v.slug, v.name]));
  priceSymbols = new Map(taxonomies.priceRanges.map((p: { slug: string; symbols: string }) => [p.slug, p.symbols]));
}

type Props = Record<string, string | number | boolean | string[] | undefined>;
// A node that becomes the given HTML element. `children` are ordinary Markdown nodes.
const element = (tag: string, properties: Props, children: unknown[] = []) =>
  ({ type: "vtElement", data: { hName: tag, hProperties: properties }, children }) as unknown as RootContent;
const embed = (...children: unknown[]) => element("div", { className: ["vt-embed"] }, children);

const COORDS = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/;
const plain = (nodes: PhrasingContent[]): string =>
  nodes.map((n) => ("value" in n ? n.value : "children" in n ? plain(n.children as PhrasingContent[]) : "")).join("");
// Editors sometimes add a backslash before characters like _ or [; inside a code those aren't wanted.
const unescape = (value: string) => value.replace(/\\([\\_*[\]()#+\-.!|{}])/g, "$1");

function placeNode(text: string, file: VFile) {
  load();
  const parts = unescape(text).split("|").map((p) => p.trim());
  let lat: number | undefined;
  let lng: number | undefined;
  let district = "";
  let vegType = "";
  let priceRange = "";
  let slug = "";

  const first = parts[0].replace(/^https?:\/\/[^/]+/, "").replace(/^\/restaurants\//, "").replace(/\/$/, "");
  const coords = parts[0].match(COORDS);
  if (coords || parts[0] === "") {
    if (coords) [lat, lng] = [Number(coords[1]), Number(coords[2])];
    [district = "", vegType = "", priceRange = ""] = parts.slice(1);
  } else {
    slug = first;
    const place = places!.get(slug);
    if (!place) {
      const close = [...places!.keys()].filter((key) => key.includes(slug) || slug.includes(key)).slice(0, 5);
      throw new Error(
        `Unknown place "${slug}" in {{place: …}} (${file.path}). Use the last part of the restaurant's URL, e.g. /restaurants/vega-cafe -> vega-cafe.` +
          (close.length ? ` Did you mean: ${close.join(", ")}?` : ""),
      );
    }
    const override = parts[1]?.match(COORDS);
    if (override) [lat, lng] = [Number(override[1]), Number(override[2])];
    else if (place.location && !place.chain) ({ lat, lng } = place.location);
    district = (override ? parts[2] : parts[1]) || place.district || "";
    if (!district && place.chain && lat === undefined) district = "Multiple locations";
    vegType = vegNames.get(place.vegType ?? "") ?? "";
    priceRange = priceSymbols.get(place.priceRange ?? "") ?? "";
  }

  return embed(
    element("span", {
      className: ["location-trigger"],
      dataLat: lat,
      dataLng: lng,
      dataDistrict: district || undefined,
      dataVegType: vegType || undefined,
      dataPriceRange: priceRange || undefined,
      dataPlace: slug || undefined,
      hidden: true,
      ariaHidden: "true",
    }),
  );
}

export function remarkShortcodes() {
  return (tree: Root, file: VFile) => {
    tree.children = tree.children.map((node) => {
      if (node.type !== "paragraph") return node;
      const children = (node as Paragraph).children;
      const first = children[0];
      const last = children[children.length - 1];
      if (first?.type !== "text" || last?.type !== "text") return node;
      const open = first.value.match(/^\s*\{\{\s*([a-z-]+)\s*:\s*/i);
      if (!open || !/\}\}\s*$/.test(last.value)) return node;

      // The paragraph's content without the {{name: and }} around it.
      const inner = children.map((child) => ({ ...child })) as PhrasingContent[];
      (inner[0] as { value: string }).value = (inner[0] as { value: string }).value.slice(open[0].length);
      const tail = inner[inner.length - 1] as { value: string };
      tail.value = tail.value.replace(/\}\}\s*$/, "");
      const text = plain(inner).trim();

      switch (open[1].toLowerCase()) {
        case "place":
          return placeNode(text, file);
        case "route": {
          const head = inner[0] as { value: string };
          const bar = head.value.indexOf("|");
          let label = (bar === -1 ? head.value : head.value.slice(0, bar)).trim();
          head.value = bar === -1 ? "" : head.value.slice(bar + 1).replace(/^\s+/, "");
          const mode = label.match(/\[([\w-]+)\]\s*$/);
          if (mode) label = label.slice(0, mode.index).trim();
          return embed(
            element("div", { className: ["route-info"], dataTravelInfo: unescape(label), dataTravelMode: mode?.[1] }, [
              element("span", { className: ["route-info-text"] }, inner),
            ]),
          );
        }
        case "end-of-day":
          return embed(element("div", { className: ["end-of-day"] }, inner));
        case "map":
        case "embed":
          return element("div", { className: ["embed-frame"] }, [
            element("iframe", { src: unescape(text), loading: "lazy", allowFullScreen: true, referrerPolicy: "no-referrer-when-downgrade", title: "Map" }),
          ]);
        case "hotels": {
          const params = new URLSearchParams({
            trs: "286810",
            shmarker: "507446",
            locale: "en",
            default_direction: unescape(text),
            sustainable: "false",
            border_radius: "5",
            plain: "true",
            powered_by: "true",
            promo_id: "2693",
            campaign_id: "84",
          });
          return element("div", { className: ["embed-widget"] }, [
            element("script", { async: true, src: `https://tp.media/content?${params}`, charSet: "utf-8" }),
          ]);
        }
        default:
          return node;
      }
    });
  };
}
