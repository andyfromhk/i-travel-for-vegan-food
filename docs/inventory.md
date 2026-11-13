# Inventory of the Webflow site

What the site consisted of when the migration started (12 November 2026). The raw data behind this page is in
`migration/export/` (the CMS) and `migration/crawl/pages.json` (every published URL).

## Content (Webflow CMS)

| Collection | Items | Published | Drafts | Archived | Became |
|---|---|---|---|---|---|
| Restaurants | 300 | 250 | 45 | 5 | `src/content/places/` |
| Articles | 62 | 58 | 0 | 4 | `src/content/guides/articles/` |
| Map Guides | 8 | 8 | 0 | 0 | `src/content/guides/map-guides/` |
| Destinations | 25 | 24 | 0 | 1 | `src/content/destinations/` |
| Authors | 2 | 2 | 0 | 0 | `src/content/authors/` |
| Countries | 7 | 7 | 0 | 0 | `src/data/countries.json` |
| Veg Types, Price Ranges, Venue Types, Cuisines | 4, 3, 14, 42 | all | 0 | 0 | `src/data/taxonomies.json` |

- Drafts are kept in `src/content` with `draft: true` and are not built. Archived items are in `migration/archive/`.
- 21 published restaurants already redirected to a guide in Webflow. Their records are kept, with `redirectTo`,
  and no page is built for them.

## Published URLs

350 URLs in the sitemap: 331 pages and 19 that redirected.

| Section | URLs |
|---|---|
| `/restaurants/…` | 250 |
| `/articles/…` | 58 (+ the `/articles` listing) |
| `/destinations/…` | 24 (+ the `/destinations` listing) |
| `/map-guides/…` | 8 |
| `/authors/…` | 2 |
| Static pages | `/`, `/about`, `/shop`, `/privacy-policy`, `/map-guides-itineraries`, `/search` |

No page had a canonical tag. Articles and map guides carried `Article` structured data and restaurants carried
`Review`; destinations and static pages carried none.

## Rich text

| What | How many | On the new site |
|---|---|---|
| Images inside guides | 1,400 | Markdown images, files in `public/media/guides/` |
| Dividers (`[.divider]` codes and `---`) | 411 | `---` |
| Tip boxes (`[.tips]` codes and block quotes) | 91 | block quotes |
| Map guide place markers | 76 | `{{place: …}}` |
| Map guide route blocks | 37 | `{{route: …}}` |
| End-of-day blocks | 6 | `{{end-of-day: …}}` |
| Hotel search widgets (Travelpayouts) | 8 | `{{hotels: …}}` |
| Google Maps embeds | 5 | `{{map: …}}` |

## Images

4,920 images, 639 MB in total. Typical size 112 KB; 36 are larger than 400 KB and 5 are larger than 1 MB
(the two largest are in the Hong Kong street food guide, at 2.4 MB and 1.8 MB).

## Forms

| Form | Where | Was sent to | Now |
|---|---|---|---|
| Newsletter sign-up | footer of every page | Webflow forms | the email Worker (`/subscribe`), which adds the reader to Kit |
| Contact | `/about` | Webflow forms | Web3Forms |
| Email me my list | Saved drawer | the email Worker | unchanged |

**Export the form submissions from Webflow before the plan ends** (Site settings → Forms): the newsletter
sign-ups collected by the footer form are only stored there.

## Scripts and third parties

| What | Where it was | Now |
|---|---|---|
| `core.js`, `guide.js`, `destination.js` | jsDelivr, from this repository | `src/scripts/`, bundled with the site |
| Finsweet Attributes (filter, sort, slider) | destination and listing pages | replaced by `src/scripts/place-filters.js` and the site's own components |
| Finsweet social share | articles and restaurants | plain share links |
| jQuery, Webflow's scripts, GSAP | every page | removed |
| Web fonts | Montserrat from Google Fonts, all 18 styles | Montserrat hosted by the site, 2 files |
| Google Analytics | GA4 `G-4E3VDR5QL6` and an old Universal Analytics tag | GA4 only |
| Google Maps | key restricted by website address, Map ID `7ffd42eb279d407c` | unchanged, loaded only when a map opens |
| Cloudflare Turnstile | the Email me my list form | also the newsletter form |

Affiliate links in the content (kept exactly as written): Klook, Booking.com, Airalo and Trip.com through
Travelpayouts (`tp.st`, `tpo.lu`), Viator and GetYourGuide.

## The shop

`/shop` lists four books and a bundle. Every button leads to Gumroad
(`itravelforveganfood.gumroad.com`); nothing is sold on the site itself. The copy is in `src/data/shop.json`.

## Things worth knowing

- The "Blog Introduction" field on articles was filled in for 10 articles but never shown on the site. It is
  kept in the files (`introduction`) and still not shown.
- 9 article sections start with a top-level heading (`#`) inside the text, so those pages have more than one
  H1. They are unchanged.
- The article category "Accomodation" is misspelt in Webflow. It is unchanged, because it appears in one
  page's description.
- The hotel widget in the Singapore guide opens on "Naramachi", which is in Nara.
- Two links in guides lead to restaurant pages that don't exist, on the old site as well: `/restaurants/shu`
  (a draft) and `/restaurants/taros-ramen-south-brisbane`.
