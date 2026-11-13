import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const image = z.object({ src: z.string(), alt: z.string().optional() });
const date = z.coerce.date().optional();

/** Every physical place: restaurants with a review page, and stops in map guides that have none. */
const places = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/places" }),
  schema: z.object({
    name: z.string(),
    nameOriginal: z.string().optional(),
    destination: z.string().optional(),
    /** `true` when the place has a review page at /restaurants/{slug}. */
    page: z.boolean().default(true),
    /** Set when the old URL already redirects somewhere else: no page is built. */
    redirectTo: z.string().optional(),
    draft: z.boolean().default(false),
    status: z
      .enum(["open", "temporarily-closed", "permanently-closed"])
      .default("open"),
    chain: z.boolean().default(false),
    storeLocator: z.string().optional(),
    vegType: z.string().optional(),
    priceRange: z.string().optional(),
    venueType: z.string().optional(),
    cuisine: z.string().optional(),
    district: z.string().optional(),
    location: z.object({ lat: z.number(), lng: z.number() }).optional(),
    address: z.string().optional(),
    mapsUrl: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    featured: z.boolean().default(false),
    likes: z.number().optional(),
    summary: z.string().optional(),
    image: image.optional(),
    gallery: z.array(image).default([]),
    menu: z.array(image).default([]),
    created: date,
    updated: date,
    published: date,
  }),
});

const destinations = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/destinations" }),
  schema: z.object({
    name: z.string(),
    country: z.string(),
    /** Position on the Destinations page and in the menu (lowest first). */
    order: z.number().default(999),
    /** Position on the home page. Leave empty to keep the destination off the home page. */
    homeOrder: z.number().optional(),
    featured: z.boolean().default(false),
    hasRestaurants: z.boolean().default(false),
    hasItinerary: z.boolean().default(false),
    /** Shows the "Vegan Travel Book" badge on the destination's card. */
    book: z.boolean().default(false),
    metaDescription: z.string().optional(),
    image: image.optional(),
    mapGraphic: image.optional(),
    gallery: z.array(image).default([]),
    travel: z
      .object({
        whereToStay: z.string().optional(),
        hotelsLink: z.string().optional(),
        esimLink: z.string().optional(),
        gettingAroundLabel: z.string().optional(),
        gettingAroundLink: z.string().optional(),
        experienceLabel: z.string().optional(),
        experienceLink: z.string().optional(),
      })
      .default({}),
    created: date,
    updated: date,
    published: date,
  }),
});

/**
 * Foodie guides and map guides in one collection. The folder decides the kind and the URL:
 * guides/articles/x.md -> /articles/x, guides/map-guides/x.md -> /map-guides/x.
 */
const guides = defineCollection({
  loader: glob({
    pattern: "{articles,map-guides}/*.md",
    base: "./src/content/guides",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    summary: z.string().optional(),
    /** Foodie guides: one of `articleCategories` in src/data/taxonomies.json. */
    category: z.string().optional(),
    /** Map guides: one of `mapGuideFocus` in src/data/taxonomies.json. */
    focus: z.string().optional(),
    destination: z.string().optional(),
    destinations: z.array(z.string()).default([]),
    author: z.string().optional(),
    mainGuide: z.boolean().default(false),
    linkToMap: z.boolean().default(false),
    displayRoutes: z.boolean().default(false),
    draft: z.boolean().default(false),
    image: image.optional(),
    gallery: z.array(image).default([]),
    tocLevels: z.string().optional(),
    introduction: z.string().optional(),
    recommendations: z.string().optional(),
    created: date,
    updated: date,
    published: date,
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/authors" }),
  schema: z.object({
    name: z.string(),
    title: z.string().optional(),
    image: image.optional(),
    website: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    pinterest: z.string().optional(),
  }),
});

/** Long copy for standalone pages (About, Privacy Policy). */
const pages = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { places, destinations, guides, authors, pages };
