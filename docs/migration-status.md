# Migration status

A running note of where the Webflow → Astro (Lumos) migration stands. Branch: `astro-migration`.
The full brief is `docs/astro-migration-brief.md`; decisions made since are listed at the bottom.

## Done

- **Phase 0, export and inventory**
  - `migration/export/`: raw JSON of all 10 Webflow collections (drafts and archived included)
  - `migration/crawl/pages.json`: title, description, Open Graph and JSON-LD of all 350 live URLs
  - `migration/redirects/webflow-301.csv`: the 301 list exported from Webflow
- **Phase 1, content conversion**
  - `migration/scripts/convert.mjs` turns the export into `src/content/` (places, destinations, guides, authors)
  - `migration/scripts/download-media.mjs` downloaded all 4,920 images to `public/media/` (639 MB)
  - `docs/conversion-report.md`: counts, place matches, warnings
- **Phase 2, first slice**: brand tokens, nav, footer, home page, destination and guide cards
- **Phase 3, pages built so far**: `/restaurants/[slug]`, `/articles/[slug]`, `/map-guides/[slug]`
- **Scripts moved into the site**: `src/scripts/core.js`, `src/scripts/guide.js`

## Still to do in Phase 3

- `/destinations` and `/destinations/[slug]` (fullscreen map, filters and sort without Finsweet)
- `/articles` combined listing with the new filters
- `/about` (Web3Forms contact form), `/shop`, `/privacy-policy`, `/authors/[slug]`, 404
- `public/_redirects`, `sitemap.xml`, `robots.txt`
- Newsletter sign-up endpoint (`/subscribe`) in `worker/`
- URL parity check against `migration/crawl/pages.json`

## Decisions made with Andy (12 Nov 2026)

- The site lives in this repository, built on the Lumos for Astro starter. Not pixel-identical: Lumos defaults are used where they fit.
- Editor: Pages CMS. Guides are plain Markdown with shortcuts (see `src/markdown/shortcodes.ts`).
- Images stay in the repository (`public/media`).
- Foodie guides and map guides share one listing at `/articles`; every guide keeps its URL. `/map-guides-itineraries` redirects to `/articles`.
- Navigation: Destinations (dropdown + "All destinations"), Vegan Foodie Guides, About, Shop button. No search.
- `/destinations`: Australia, Japan, Thailand, More Destinations. Cards show guide and place counts and the book badge.
- Contact form: Web3Forms. Newsletter: Kit, through the existing Worker.
- Hosting: Cloudflare Worker with static assets (`wrangler.jsonc`).
