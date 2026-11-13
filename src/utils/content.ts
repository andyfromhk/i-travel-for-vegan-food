import { getCollection, type CollectionEntry } from "astro:content";
import countriesData from "@/data/countries.json";
import taxonomies from "@/data/taxonomies.json";
import mediaSizes from "@/data/media.json";

export type Place = CollectionEntry<"places">;
export type Destination = CollectionEntry<"destinations">;
export type Guide = CollectionEntry<"guides">;
export type Author = CollectionEntry<"authors">;
export type Country = (typeof countriesData)[number];
export type Picture = { src: string; alt?: string };

export const countries: Country[] = countriesData;
export { taxonomies };

const named = <T extends { slug: string }>(list: T[]) =>
  new Map(list.map((item) => [item.slug, item]));
export const vegTypes = named(taxonomies.vegTypes);
export const priceRanges = named(taxonomies.priceRanges);
export const venueTypes = named(taxonomies.venueTypes);
export const cuisines = named(taxonomies.cuisines);
export const articleCategories = named(taxonomies.articleCategories);
export const mapGuideFocus = named(taxonomies.mapGuideFocus);
export const countryBySlug = named(countries);

/** Width and height of an image in public/media, so the page can hold its space while it loads. */
export function mediaSize(src?: string): { width?: number; height?: number } {
  const size = src ? (mediaSizes as Record<string, number[]>)[src] : undefined;
  return size ? { width: size[0], height: size[1] } : {};
}

const time = (value?: Date) => (value ? value.getTime() : 0);

/** Everything the pages need, loaded once per build. */
let cache: Promise<Site> | undefined;
export const getSite = () => (cache ??= loadSite());

export interface Site {
  places: Place[];
  destinations: Destination[];
  guides: Guide[];
  authors: Author[];
  placeBySlug: Map<string, Place>;
  destinationBySlug: Map<string, Destination>;
}

async function loadSite(): Promise<Site> {
  const [places, destinations, guides, authors] = await Promise.all([
    getCollection("places", ({ data }) => !data.draft),
    getCollection("destinations"),
    getCollection("guides", ({ data }) => !data.draft),
    getCollection("authors"),
  ]);
  destinations.sort(
    (a, b) =>
      a.data.order - b.data.order || a.data.name.localeCompare(b.data.name),
  );
  // Newest first: the guide that was updated most recently leads every list.
  guides.sort((a, b) => time(b.data.updated) - time(a.data.updated));
  return {
    places,
    destinations,
    guides,
    authors,
    placeBySlug: new Map(places.map((p) => [p.id, p])),
    destinationBySlug: new Map(destinations.map((d) => [d.id, d])),
  };
}

/* ---------- Places ---------- */

/** A place has a public review page when it isn't a page-less stop and its URL doesn't redirect away. */
export const hasPage = (place: Place) =>
  place.data.page && !place.data.redirectTo;
export const placeUrl = (place: Place) => `/restaurants/${place.id}`;
export const isClosed = (place: Place) =>
  place.data.status === "permanently-closed";

export const STATUS_LABEL = {
  open: "Open",
  "temporarily-closed": "Temporarily closed",
  "permanently-closed": "Permanently closed",
} as const;

/** Restaurants shown in a destination's list and on its map: most liked first, then newest. */
export async function placesIn(destination: string): Promise<Place[]> {
  const { places } = await getSite();
  return places
    .filter(
      (p) => p.data.destination === destination && hasPage(p) && !isClosed(p),
    )
    .sort(
      (a, b) =>
        (b.data.likes ?? 0) - (a.data.likes ?? 0) ||
        time(b.data.created) - time(a.data.created),
    );
}

/** "Cafe, Desserts": the venue type and cuisine line on cards and review pages. */
export function placeKind(place: Place, separator = ", "): string {
  return [
    venueTypes.get(place.data.venueType ?? "")?.name,
    cuisines.get(place.data.cuisine ?? "")?.name,
  ]
    .filter(Boolean)
    .join(separator);
}

/* ---------- Guides ---------- */

export const isMapGuide = (guide: Guide) => guide.id.startsWith("map-guides/");
export const guideSlug = (guide: Guide) => guide.id.split("/")[1];
export const guideUrl = (guide: Guide) => `/${guide.id}`;

/** The small label above a guide's title: its category, or the map guide's focus. */
export function guideLabel(guide: Guide): string {
  if (isMapGuide(guide)) {
    const name = mapGuideFocus.get(guide.data.focus ?? "")?.name ?? "Map Guide";
    // "Itinerary for First-Timers" and its siblings are all shown simply as "Itinerary".
    return /itinerary/i.test(name) ? "Itinerary" : name;
  }
  return articleCategories.get(guide.data.category ?? "")?.name ?? "";
}

/** Every destination a guide belongs to: its main one first, then the others it covers. */
export function guideDestinations(guide: Guide): string[] {
  return [
    ...new Set(
      [guide.data.destination, ...guide.data.destinations].filter(
        Boolean,
      ) as string[],
    ),
  ];
}

/** Guides for a destination: its main guide first, then the rest, newest first. */
export async function guidesFor(destination: string): Promise<Guide[]> {
  const { guides } = await getSite();
  return guides
    .filter((g) => guideDestinations(g).includes(destination))
    .sort(
      (a, b) =>
        Number(b.data.mainGuide && b.data.destination === destination) -
        Number(a.data.mainGuide && a.data.destination === destination),
    );
}

/* ---------- Destinations ---------- */

/** "Australia", "Japan", "Thailand", then everything else under "More Destinations". */
export async function destinationGroups(): Promise<
  { title: string; slug: string; destinations: Destination[] }[]
> {
  const { destinations } = await getSite();
  const groups = countries
    .filter((c) => "navGroup" in c && c.navGroup)
    .map((c) => ({
      title: c.name,
      slug: c.slug,
      destinations: destinations.filter((d) => d.data.country === c.slug),
    }));
  const grouped = new Set(groups.map((g) => g.slug));
  const rest = destinations.filter((d) => !grouped.has(d.data.country));
  return [
    ...groups,
    { title: "More Destinations", slug: "more", destinations: rest },
  ].filter((g) => g.destinations.length);
}

/** The line under a destination's name on its card: "4 Guides · 38 Places · Restaurant Map". */
export async function destinationCounts(destination: Destination) {
  const [guides, places] = await Promise.all([
    guidesFor(destination.id),
    placesIn(destination.id),
  ]);
  const hasMap = places.some((p) => p.data.location);
  const parts = [
    guides.length &&
      `${guides.length} ${guides.length === 1 ? "Guide" : "Guides"}`,
    places.length &&
      `${places.length} ${places.length === 1 ? "Place" : "Places"}`,
    hasMap && "Restaurant Map",
  ].filter(Boolean) as string[];
  return {
    guides: guides.length,
    places: places.length,
    hasMap,
    text: parts.join(" · "),
  };
}

/* ---------- Dates ---------- */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
/** "Oct 15, 2026", the format the site has always shown. */
export function shortDate(date?: Date): string {
  if (!date) return "";
  return `${MONTHS[date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, "0")}, ${date.getUTCFullYear()}`;
}
