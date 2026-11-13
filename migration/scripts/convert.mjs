// Converts the Webflow export (migration/export) into the new site's content files.
//
//   Restaurants   -> src/content/places/{slug}.md
//   Destinations  -> src/content/destinations/{slug}.md
//   Articles      -> src/content/guides/articles/{slug}.md
//   Map Guides    -> src/content/guides/map-guides/{slug}.md
//   Authors       -> src/content/authors/{slug}.md
//   Small lists   -> src/data/taxonomies.json  (veg types, price ranges, venue types, cuisines, categories)
//
// It also writes:
//   migration/media-manifest.json   every image the content uses: where it is now, and where it goes in public/media
//   docs/conversion-report.md       counts, warnings and the place matches to double-check
//
// Safe to re-run: it rebuilds those folders from the export every time. Drafts are kept with `draft: true`.
// Archived items go to migration/archive/ and are not part of the site.
//
// Run:  node migration/scripts/convert.mjs

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { cleanHref, richTextToMarkdown, slugify } from "./lib/richtext.mjs";

const EXPORT = "migration/export/collections";
const CRAWL_HTML = "migration/crawl/html";
const CONTENT = "src/content";
const ARCHIVE = "migration/archive";

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const items = async (name) =>
  (await readJson(`${EXPORT}/${name}.items.json`)).items;
const schema = async (name) => readJson(`${EXPORT}/${name}.schema.json`);

const [
  restaurants,
  destinations,
  articles,
  mapGuides,
  countries,
  authors,
  vegTypes,
  priceRanges,
  venueTypes,
  cuisines,
] = await Promise.all(
  [
    "restaurants",
    "destinations",
    "articles",
    "map-guides",
    "countries",
    "authors",
    "veg-types",
    "price-ranges",
    "venue-types",
    "cuisines",
  ].map(items),
);

// ---------------------------------------------------------------------------
// Lookups: Webflow ids -> slugs and option names
// ---------------------------------------------------------------------------

const bySlug = (list) =>
  new Map(list.map((item) => [item.id, item.fieldData.slug]));
const destinationSlug = bySlug(destinations);
const countrySlug = bySlug(countries);
const authorSlug = bySlug(authors);
const vegTypeSlug = bySlug(vegTypes);
const priceRangeSlug = bySlug(priceRanges);
const venueTypeSlug = bySlug(venueTypes);
const cuisineSlug = bySlug(cuisines);
const destinationName = new Map(
  destinations.map((d) => [d.fieldData.slug, d.fieldData.name]),
);
const vegTypeName = new Map(
  vegTypes.map((v) => [v.fieldData.slug, v.fieldData.name]),
);
const priceSymbols = new Map(
  priceRanges.map((p) => [p.fieldData.slug, p.fieldData.symbols]),
);

async function options(collection, field) {
  const fields = (await schema(collection)).fields;
  const found = fields.find((f) => f.slug === field);
  return new Map(
    (found?.validations?.options || []).map((o) => [o.id, o.name]),
  );
}
const articleCategory = await options("articles", "category");
const mapGuideFocus = await options("map-guides", "focus");
const displayRoutes = await options("map-guides", "display-routes");
const restaurantStatus = await options("restaurants", "status-2");
const cuisineCategory = await options("cuisines", "category");

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const report = {
  warnings: [], // { item, message }
  placeMatches: [],
  newPlaces: [],
  inlinePlaces: [],
  districtConflicts: [],
  counts: {},
};
const warnFor = (item) => (message) => report.warnings.push({ item, message });

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

// Alt text the live site shows today, by image file name. Rich text images often say "inherit the alt text
// from the asset", which the export can't resolve, so the published HTML is the reference.
const liveAlt = new Map();
async function readLiveAlts(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(
    () => [],
  )) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await readLiveAlts(full);
    else if (entry.name.endsWith(".html")) {
      const html = await readFile(full, "utf8");
      for (const tag of html.match(/<img\b[^>]*>/g) || []) {
        const src = (tag.match(/\bsrc="([^"]+)"/) || [])[1];
        const alt = (tag.match(/\balt="([^"]*)"/) || [])[1];
        if (src && alt) liveAlt.set(fileKey(src), decodeEntities(alt));
      }
    }
  }
}
const decodeEntities = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

function fileKey(url) {
  const clean = url.split("?")[0];
  if (/website-files\.com|uploads-ssl\.webflow\.com/.test(clean))
    return clean.slice(clean.lastIndexOf("/") + 1);
  return clean;
}

const media = new Map(); // fileKey -> { url, path }
const usedPaths = new Set();

function mediaPath(url, folder) {
  if (!url) return null;
  const key = fileKey(url);
  if (media.has(key)) return media.get(key).path;

  let name = key
    .slice(key.lastIndexOf("/") + 1)
    .replace(/^([0-9a-f]{24}[_-])+/, "");
  try {
    name = decodeURIComponent(name);
  } catch {}
  const ext = (name.match(/\.[a-z0-9]+$/i) || [".jpg"])[0].toLowerCase();
  const base =
    name
      .slice(0, name.length - ext.length)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^([0-9a-f]{24}-)+/, "")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "image";

  let candidate = `/media/${folder}/${base}${ext}`;
  for (let n = 2; usedPaths.has(candidate); n++)
    candidate = `/media/${folder}/${base}-${n}${ext}`;
  usedPaths.add(candidate);

  // Old rich text still points at Webflow's previous CDN host; the same file lives on the current one.
  const download = url.replace(
    "uploads-ssl.webflow.com",
    "cdn.prod.website-files.com",
  );
  media.set(key, { url: download, path: candidate });
  return candidate;
}

function image(field, folder) {
  if (!field || !field.url) return undefined;
  const result = { src: mediaPath(field.url, folder) };
  const alt = field.alt || liveAlt.get(fileKey(field.url));
  if (alt) result.alt = alt;
  return result;
}
const images = (list, folder) =>
  (list || []).map((f) => image(f, folder)).filter(Boolean);

// ---------------------------------------------------------------------------
// Writing files
// ---------------------------------------------------------------------------

// Drops empty values so the files only hold what is actually set.
function compact(value) {
  if (Array.isArray(value))
    return value.map(compact).filter((v) => v !== undefined);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, v] of Object.entries(value)) {
      const c = compact(v);
      if (
        c === undefined ||
        c === null ||
        c === "" ||
        (Array.isArray(c) && !c.length) ||
        (typeof c === "object" && !Array.isArray(c) && !Object.keys(c).length)
      )
        continue;
      out[key] = c;
    }
    return out;
  }
  return value === null ? undefined : value;
}

async function writeEntry(file, data, body = "") {
  await mkdir(path.dirname(file), { recursive: true });
  const front = YAML.stringify(compact(data), { lineWidth: 0 }).trimEnd();
  await writeFile(file, `---\n${front}\n---\n${body ? `\n${body}\n` : ""}`);
}

// Each output folder is emptied once per run, so files for items deleted in Webflow do not linger.
const generatedDirs = new Set();
async function rmGenerated(dir) {
  if (generatedDirs.has(dir)) return;
  generatedDirs.add(dir);
  await rm(dir, { recursive: true, force: true });
}

const dates = (item) => ({
  created: item.createdOn,
  updated: item.lastUpdated,
  published: item.lastPublished,
});
const text = (value) =>
  typeof value === "string"
    ? value
        .replace(/[​-‍﻿]/g, "")
        .replace(/ /g, " ")
        .trim()
    : value;
const state = (item) =>
  item.isArchived ? "archived" : item.isDraft ? "draft" : "live";

// ---------------------------------------------------------------------------
// Redirects that already exist in Webflow (needed to know which restaurant pages are redirected away)
// ---------------------------------------------------------------------------

const redirectCsv = await readFile(
  "migration/redirects/webflow-301.csv",
  "utf8",
).catch(() => "");
const redirects = new Map(
  redirectCsv
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const comma = line.indexOf(",");
      return [line.slice(0, comma), line.slice(comma + 1)];
    }),
);

// ---------------------------------------------------------------------------
// 1. Places (restaurants)
// ---------------------------------------------------------------------------

await readLiveAlts(CRAWL_HTML);

const STATUS = {
  Open: "open",
  "Temporarily closed": "temporarily-closed",
  "Permanently closed": "permanently-closed",
};
const number = (value) => {
  const n = Number(String(value ?? "").trim());
  return value !== null &&
    value !== undefined &&
    String(value).trim() !== "" &&
    Number.isFinite(n)
    ? n
    : undefined;
};

const places = new Map(); // slug -> { item state, data, body }
for (const item of restaurants) {
  const f = item.fieldData;
  const slug = f.slug;
  const folder = `restaurants/${slug}`;
  const lat = number(f["latitude-2"]);
  const lng = number(f["longitude-2"]);
  const data = {
    name: text(f.name),
    nameOriginal: text(f["name-in-original-language"]),
    destination: destinationSlug.get(f.city),
    page: true,
    redirectTo: redirects.get(`/restaurants/${slug}`),
    draft: item.isDraft || undefined,
    status: STATUS[restaurantStatus.get(f["status-2"])] || "open",
    chain: f.chain || undefined,
    storeLocator: f["store-locator"],
    vegType: vegTypeSlug.get(f["veg-type"]),
    priceRange: priceRangeSlug.get(f["price-range"]),
    venueType: venueTypeSlug.get(f["venue-type"]),
    cuisine: cuisineSlug.get(f["cuisine-3"]),
    district: undefined,
    location: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
    address: text(f["address-text"]),
    mapsUrl: f["google-map-share-link"],
    phone: text(f["phone-2"]),
    website: f.website,
    instagram: f.instagram,
    facebook: f.facebook,
    featured: f.featured || undefined,
    likes: f.likes ?? undefined,
    summary: text(f["meta-description"]),
    image: image(f["featured-photo"], folder),
    gallery: images(f.gallery, folder),
    menu: images(f.menu, folder),
    ...dates(item),
  };
  const body = richTextToMarkdown(f.description, {
    media: (url) => mediaPath(url, folder),
    alt: (url, alt) =>
      alt && alt !== "__wf_reserved_inherit"
        ? alt
        : liveAlt.get(fileKey(url)) || "",
    place: () => "",
    warn: warnFor(`restaurants/${slug}`),
    figures: [],
  });
  places.set(slug, { state: state(item), data, body });
}

// Looking places up by name, for the map guides.
const normaliseName = (name) =>
  slugify(String(name).replace(/^\d+[.)]\s*/, ""));
const placesByDestination = new Map();
for (const [slug, place] of places) {
  if (place.state === "archived") continue;
  const key = place.data.destination;
  if (!placesByDestination.has(key)) placesByDestination.set(key, []);
  placesByDestination
    .get(key)
    .push({ slug, name: normaliseName(place.data.name) });
}

// ---------------------------------------------------------------------------
// 2. Destinations
// ---------------------------------------------------------------------------

// Which destinations show the "Vegan Travel Book" badge today. That is set in the Webflow Designer,
// not in the CMS, so it is read from the published Destinations page.
const destinationsHtml = await readFile(
  `${CRAWL_HTML}/destinations.html`,
  "utf8",
).catch(() => "");
const hasBookBadge = new Set();
for (const card of destinationsHtml.matchAll(
  /<a href="\/destinations\/([^"]+)" class="card[^"]*">([\s\S]*?)<\/a>/g,
)) {
  if (
    /destination-card-top-right-info-div(?! w-condition-invisible)/.test(
      card[2],
    )
  )
    hasBookBadge.add(card[1]);
}

// The order destinations appear in (Destinations page and the home page) is also set in the Designer.
const pageOrder = [
  ...destinationsHtml.matchAll(
    /<a href="\/destinations\/([^"]+)" class="card/g,
  ),
].map((m) => m[1]);
const homeHtml = await readFile(`${CRAWL_HTML}/index.html`, "utf8").catch(
  () => "",
);
const homeOrder = [
  ...homeHtml.matchAll(/<a href="\/destinations\/([^"]+)" class="card/g),
].map((m) => m[1]);
const position = (list, slug) =>
  list.includes(slug) ? list.indexOf(slug) + 1 : undefined;

for (const item of destinations) {
  const f = item.fieldData;
  const slug = f.slug;
  const folder = `destinations/${slug}`;
  const data = {
    name: text(f.name),
    country: countrySlug.get(f["destination-country"]),
    order: position(pageOrder, slug),
    homeOrder: position(homeOrder, slug),
    featured: f["featured-2"] || undefined,
    hasRestaurants: f.restaurants || undefined,
    hasItinerary: f.itinerary || undefined,
    book: hasBookBadge.has(slug) || undefined,
    metaDescription: text(f["meta-description"]),
    image: image(f["featured-photo"], folder),
    mapGraphic: image(f["map-graphic"], folder),
    gallery: images(f["destination-gallery"], folder),
    travel: {
      whereToStay: text(f["where-to-stay-tip"]),
      hotelsLink: f["hotels-link"],
      esimLink: f["esim-link"],
      gettingAroundLabel: text(f["getting-around-label"]),
      gettingAroundLink: f["getting-around-link"],
      experienceLabel: text(f["experience-label"]),
      experienceLink: f["experience-link"],
    },
    ...dates(item),
  };
  const body = richTextToMarkdown(f["city-description"], {
    media: (url) => mediaPath(url, folder),
    alt: (url, alt) => alt || "",
    place: () => "",
    warn: warnFor(`destinations/${slug}`),
    figures: [],
  });
  const dir = item.isArchived
    ? `${ARCHIVE}/destinations`
    : `${CONTENT}/destinations`;
  await rmGenerated(dir);
  await writeEntry(`${dir}/${slug}.md`, data, body);
}

// ---------------------------------------------------------------------------
// 3. Guides: articles and map guides
// ---------------------------------------------------------------------------

const figures = []; // every figure in guide bodies, with its alignment (to study image pairs)
const optionSlug = (name) => slugify(name || "");

function placeShortcode(guide, destination) {
  return (data, heading, linkedSlugs) => {
    const name = normaliseName(heading);
    const inDestination = placesByDestination.get(destination) || [];
    const isFood = Boolean(data.vegType);

    // 1. A link to the restaurant's page inside the section.
    const linked = linkedSlugs.filter((slug) => places.has(slug));
    let slug = linked.find((s) => {
      const n = normaliseName(places.get(s).data.name);
      return n === name || n.includes(name) || name.includes(n);
    });
    let method = slug ? "link + name" : "";
    if (!slug && isFood && linked.length === 1) {
      slug = linked[0];
      method = "link only (please confirm)";
    }
    // 2. The same name in the same destination.
    if (!slug) {
      const hit =
        inDestination.find((p) => p.name === name) ||
        inDestination.find(
          (p) =>
            name &&
            (p.name.includes(name) || name.includes(p.name)) &&
            Math.min(p.name.length, name.length) >= 5,
        );
      if (hit && (isFood || hit.name === name)) {
        slug = hit.slug;
        method = hit.name === name ? "name" : "similar name (please confirm)";
      }
    }

    if (slug) {
      const place = places.get(slug).data;
      const isChainNote = /multiple/i.test(data.district);
      const metres =
        place.location && data.lat !== null
          ? Math.round(distance(place.location, data))
          : null;
      // The guide's own spot is kept, written after the slug, whenever the restaurant record can't supply
      // the same point: the record is a chain (chains have no single location), it has no coordinates, or
      // its coordinates are more than 100 m away (a different branch or entrance). That way the stops and
      // the route on the map stay exactly where they were.
      const otherSpot =
        data.lat !== null && (place.chain || metres === null || metres > 100);
      if (data.district && !isChainNote && !otherSpot) {
        if (!place.district) place.district = data.district;
        else if (place.district !== data.district)
          report.districtConflicts.push({
            guide,
            slug,
            kept: place.district,
            other: data.district,
          });
      }
      const vegMatches =
        !data.vegType ||
        vegTypeName.get(place.vegType)?.toLowerCase() ===
          data.vegType.toLowerCase();
      const priceMatches =
        !data.priceRange ||
        priceSymbols.get(place.priceRange) === data.priceRange;
      report.placeMatches.push({
        guide,
        heading,
        slug,
        method,
        metres,
        vegMatches,
        priceMatches,
        guideVeg: data.vegType,
        guidePrice: data.priceRange,
        chain: isChainNote,
      });
      // If the restaurant record has no coordinates but the guide does, keep the guide's so the marker still shows.
      if (!place.location && data.lat !== null && !place.chain)
        place.location = { lat: data.lat, lng: data.lng };
      if (otherSpot)
        return [slug, `${data.lat}, ${data.lng}`, data.district]
          .filter(Boolean)
          .join(" | ");
      // The guide calls it "Multiple locations" but the restaurant isn't marked as a chain: keep the guide's wording.
      if (isChainNote && !place.chain) return `${slug} | ${data.district}`;
      return slug;
    }

    // 3. A food place with no restaurant page: it becomes a place record without a page.
    if (isFood) {
      const newSlug = `${destination || "guide"}-${name}`;
      if (!places.has(newSlug)) {
        places.set(newSlug, {
          state: "live",
          data: {
            name: heading.replace(/^\d+[.)]\s*/, ""),
            destination,
            page: false,
            status: "open",
            chain: /multiple/i.test(data.district) || undefined,
            vegType: vegTypes.find(
              (v) =>
                v.fieldData.name.toLowerCase() === data.vegType.toLowerCase(),
            )?.fieldData.slug,
            priceRange: priceRanges.find(
              (p) => p.fieldData.symbols === data.priceRange,
            )?.fieldData.slug,
            district: /multiple/i.test(data.district)
              ? undefined
              : data.district,
            location:
              data.lat !== null ? { lat: data.lat, lng: data.lng } : undefined,
          },
          body: "",
        });
        report.newPlaces.push({ guide, heading, slug: newSlug });
      }
      return newSlug;
    }

    // 4. A sight or other stop: its coordinates stay in the guide.
    report.inlinePlaces.push({ guide, heading });
    return [data.lat !== null ? `${data.lat}, ${data.lng}` : "", data.district]
      .filter((v, i) => v || i === 0)
      .join(" | ");
  };
}

function distance(a, b) {
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6371000;
}

const guideCounts = {
  articles: { live: 0, draft: 0, archived: 0 },
  "map-guides": { live: 0, draft: 0, archived: 0 },
};

for (const item of articles) {
  const f = item.fieldData;
  const slug = f.slug;
  const folder = `guides/${slug}`;
  const id = `articles/${slug}`;
  const destination = destinationSlug.get(f["main-destination-if-any"]);
  const ctx = {
    media: (url) => mediaPath(url, folder),
    alt: (url, alt) =>
      alt && alt !== "__wf_reserved_inherit"
        ? alt
        : liveAlt.get(fileKey(url)) || "",
    place: placeShortcode(id, destination),
    warn: warnFor(id),
    figures,
  };
  const data = {
    title: text(f.name),
    description: text(f["meta-description"]),
    summary: text(f["intro-text"]),
    category: optionSlug(articleCategory.get(f.category)),
    destination,
    destinations: (f["referenced-cities"] || [])
      .map((d) => destinationSlug.get(d))
      .filter(Boolean),
    author: authorSlug.get(f["guest-author"]),
    mainGuide: f.featured || undefined,
    linkToMap: f.map || undefined,
    draft: item.isDraft || undefined,
    image: image(f["featured-image"], folder),
    gallery: images(f.gallery, folder),
    tocLevels:
      f["toc-based-on"] && f["toc-based-on"] !== "h2,h3"
        ? f["toc-based-on"]
        : undefined,
    introduction: richTextToMarkdown(f["blog-introduction"], ctx),
    recommendations: richTextToMarkdown(f["destination-recommendations"], ctx),
    ...dates(item),
  };
  const body = richTextToMarkdown(f["blog-content"], ctx);
  guideCounts.articles[state(item)]++;
  const dir = item.isArchived
    ? `${ARCHIVE}/guides/articles`
    : `${CONTENT}/guides/articles`;
  await rmGenerated(dir);
  await writeEntry(`${dir}/${slug}.md`, data, body);
}

for (const item of mapGuides) {
  const f = item.fieldData;
  const slug = f.slug;
  const folder = `guides/${slug}`;
  const id = `map-guides/${slug}`;
  const destination = destinationSlug.get(f["referenced-destination"]);
  const ctx = {
    media: (url) => mediaPath(url, folder),
    alt: (url, alt) =>
      alt && alt !== "__wf_reserved_inherit"
        ? alt
        : liveAlt.get(fileKey(url)) || "",
    place: placeShortcode(id, destination),
    warn: warnFor(id),
    figures,
  };
  const data = {
    title: text(f.name),
    description: text(f["short-description"]),
    focus: optionSlug(mapGuideFocus.get(f.focus)),
    destination,
    displayRoutes:
      displayRoutes.get(f["display-routes"]) === "true" || undefined,
    draft: item.isDraft || undefined,
    image: image(f["featured-image"], folder),
    ...dates(item),
  };
  const body = richTextToMarkdown(f.content, ctx);
  guideCounts["map-guides"][state(item)]++;
  const dir = item.isArchived
    ? `${ARCHIVE}/guides/map-guides`
    : `${CONTENT}/guides/map-guides`;
  await rmGenerated(dir);
  await writeEntry(`${dir}/${slug}.md`, data, body);
}

// ---------------------------------------------------------------------------
// 4. Write the places (after the guides, which add districts and page-less places)
// ---------------------------------------------------------------------------

const placeCounts = {
  live: 0,
  draft: 0,
  archived: 0,
  withoutPage: 0,
  redirected: 0,
};
for (const [slug, place] of places) {
  const dir =
    place.state === "archived" ? `${ARCHIVE}/places` : `${CONTENT}/places`;
  await rmGenerated(dir);
  placeCounts[place.state]++;
  if (!place.data.page) placeCounts.withoutPage++;
  if (place.data.redirectTo) placeCounts.redirected++;
  await writeEntry(`${dir}/${slug}.md`, place.data, place.body);
}

// ---------------------------------------------------------------------------
// 5. Authors and the small lists
// ---------------------------------------------------------------------------

await rmGenerated(`${CONTENT}/authors`);
for (const item of authors) {
  const f = item.fieldData;
  const data = {
    name: text(f.name),
    title: text(f.title),
    image: image(f["profile-picture"], "authors"),
    website: f["website-link"],
    instagram: f["instagram-link"],
    facebook: f["facebook-link"],
    pinterest: f["pinterest-link"],
  };
  const body = richTextToMarkdown(f["short-bio"], {
    media: (url) => mediaPath(url, "authors"),
    alt: (u, a) => a || "",
    place: () => "",
    warn: warnFor(`authors/${f.slug}`),
    figures: [],
  });
  await writeEntry(`${CONTENT}/authors/${f.slug}.md`, data, body);
}

const named = (map) =>
  [...map.values()].map((name) => ({ slug: optionSlug(name), name }));
await mkdir("src/data", { recursive: true });
await writeFile(
  "src/data/taxonomies.json",
  JSON.stringify(
    {
      vegTypes: vegTypes.map((v) => ({
        slug: v.fieldData.slug,
        name: v.fieldData.name,
        colour: v.fieldData.colour,
      })),
      priceRanges: priceRanges.map((p) => ({
        slug: p.fieldData.slug,
        name: p.fieldData.name,
        symbols: p.fieldData.symbols,
      })),
      venueTypes: venueTypes.map((v) => ({
        slug: v.fieldData.slug,
        name: v.fieldData.name,
        schemaType: v.fieldData["schema-type"],
      })),
      cuisines: cuisines.map((c) =>
        compact({
          slug: c.fieldData.slug,
          name: c.fieldData.name,
          group: cuisineCategory.get(c.fieldData.category),
          keywords: c.fieldData["keywords-tags"],
        }),
      ),
      articleCategories: named(articleCategory),
      mapGuideFocus: named(mapGuideFocus),
    },
    null,
    2,
  ) + "\n",
);

// Countries as they are in Webflow (flags only; currency and phrase-card language live in src/data/countries.json).
const countryExport = countries.map((c) =>
  compact({
    slug: c.fieldData.slug,
    name: c.fieldData.name,
    flag: image(c.fieldData.flag, "countries"),
  }),
);

// ---------------------------------------------------------------------------
// 6. Media manifest and report
// ---------------------------------------------------------------------------

await mkdir("migration/tmp", { recursive: true });
await writeFile(
  "migration/media-manifest.json",
  JSON.stringify([...media.values()], null, 1) + "\n",
);
await writeFile("migration/tmp/figures.json", JSON.stringify(figures));
await writeFile(
  "migration/tmp/countries-export.json",
  JSON.stringify(countryExport, null, 2),
);

const count = (list) =>
  list.reduce(
    (acc, item) => ((acc[state(item)] = (acc[state(item)] || 0) + 1), acc),
    {},
  );
const row = (...cells) => `| ${cells.join(" | ")} |`;
const lines = [];
lines.push("# Conversion report", "");
lines.push(
  "Written by `migration/scripts/convert.mjs`. Re-run the script to refresh it.",
  "",
);
lines.push("## Item counts", "");
lines.push(
  row(
    "Collection",
    "In Webflow",
    "Published",
    "Drafts",
    "Archived (not built)",
  ),
  row("---", "---", "---", "---", "---"),
);
for (const [name, list] of [
  ["Restaurants", restaurants],
  ["Articles", articles],
  ["Map Guides", mapGuides],
  ["Destinations", destinations],
  ["Authors", authors],
]) {
  const c = count(list);
  lines.push(
    row(name, list.length, c.live || 0, c.draft || 0, c.archived || 0),
  );
}
lines.push("");
lines.push(
  `- Restaurant pages that already redirect elsewhere in Webflow (kept as data, no page built): **${placeCounts.redirected}**`,
);
lines.push(
  `- Places without a review page, created from map guides: **${report.newPlaces.length}**`,
);
lines.push(`- Images referenced by the content: **${media.size}**`, "");

lines.push("## Map guide places", "");
lines.push(
  "Each place marker in a map guide was matched to a restaurant record, so its coordinates, veg type and price now come from that record.",
  "",
);
lines.push(
  row(
    "Guide",
    "Heading",
    "Restaurant",
    "Matched by",
    "Distance from old marker",
    "Notes",
  ),
  row("---", "---", "---", "---", "---", "---"),
);
for (const m of report.placeMatches) {
  const notes = [
    m.chain && "chain",
    !m.vegMatches && `veg type in guide was "${m.guideVeg}"`,
    !m.priceMatches && `price in guide was "${m.guidePrice}"`,
    m.metres > 100 &&
      "different spot from the restaurant record, so the guide keeps its own coordinates",
  ]
    .filter(Boolean)
    .join("; ");
  lines.push(
    row(
      m.guide.replace("map-guides/", ""),
      m.heading,
      `\`${m.slug}\``,
      m.method,
      m.metres === null ? "n/a" : `${m.metres} m`,
      notes,
    ),
  );
}
lines.push("");
if (report.newPlaces.length) {
  lines.push(
    "### Food places with no restaurant page",
    "",
    "These became place records with `page: false` (no public page).",
    "",
  );
  for (const p of report.newPlaces)
    lines.push(`- ${p.heading} — \`${p.slug}\` (${p.guide})`);
  lines.push("");
}
if (report.inlinePlaces.length) {
  lines.push(
    "### Sights and other stops",
    "",
    "These keep their coordinates in the guide itself: `{{place: lat, lng | Area}}`.",
    "",
  );
  for (const p of report.inlinePlaces)
    lines.push(`- ${p.heading} (${p.guide})`);
  lines.push("");
}
if (report.districtConflicts.length) {
  lines.push("### Area names that differ between guides", "");
  for (const c of report.districtConflicts)
    lines.push(
      `- \`${c.slug}\`: kept "${c.kept}", ${c.guide} says "${c.other}"`,
    );
  lines.push("");
}

lines.push("## Warnings", "");
if (!report.warnings.length) lines.push("None.");
const grouped = new Map();
for (const w of report.warnings)
  grouped.set(w.item, [...(grouped.get(w.item) || []), w.message]);
for (const [item, messages] of grouped) {
  lines.push(`- **${item}**`);
  for (const message of [...new Set(messages)]) lines.push(`  - ${message}`);
}
lines.push("");
await writeFile("docs/conversion-report.md", lines.join("\n"));

console.log(
  "places",
  placeCounts,
  "| guides",
  JSON.stringify(guideCounts),
  "| images",
  media.size,
);
console.log(
  `place matches ${report.placeMatches.length}, new page-less places ${report.newPlaces.length}, inline stops ${report.inlinePlaces.length}, warnings ${report.warnings.length}`,
);
