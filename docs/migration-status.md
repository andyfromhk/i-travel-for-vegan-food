# Migration status

Where the Webflow → Astro (Lumos) migration stands. Branch: `astro-migration`.
The original brief is `docs/astro-migration-brief.md`; the decisions made since are at the bottom of this page.

## Done (Phases 0 to 3)

- **Export and inventory.** All 10 Webflow collections, every published URL and the 301 list are saved under
  `migration/`. See `docs/inventory.md`.
- **Content conversion.** 300 restaurants, 66 guides, 24 destinations and 2 authors are Markdown files in
  `src/content/`. All 4,920 images are in `public/media/`. See `docs/conversion-report.md`.
- **Every page type is built**: home, `/destinations`, destination pages, `/articles` (foodie guides and map
  guides together), foodie guides, map guides, restaurant pages, author pages, About, Shop, Privacy Policy, 404.
- **Your scripts are part of the site** (`src/scripts/`): saved places, Email me my list, phrase card, price
  converter, closed badges, the scroll-synced map on map guides, the fullscreen restaurant map.
  Finsweet is gone: `src/scripts/place-filters.js` does the filtering and sorting.
- **Search engines see the same site.** All 350 old URLs keep their address, title and description, or redirect
  as before. See `docs/parity-report.md`.

## Checked, and how

| Check | Result |
|---|---|
| Build | 330 pages, about 30 seconds |
| Type check (`npx astro check`) | 0 errors, 0 warnings |
| Old URLs (`migration/scripts/check-parity.mjs`) | 348 identical, 2 redirect on purpose (`/map-guides-itineraries`, `/search`), 0 missing |
| Internal links | 18,640 checked; 2 lead nowhere, and both were already broken on the old site |
| Table-of-contents anchors | 665 of 666 kept (the one lost was an empty heading) |
| Email Worker tests | 23 pass (20 existing, 3 new) |
| Listing filters, map list filters and sorting, Save buttons | tested in a browser on the local build |

## Not checked yet

- **Google Maps.** The key only answers `itravelforveganfood.com`, so no map could load during the build work.
  The map code is your own, moved across with small changes, but the scroll-synced map and the fullscreen map
  have not been seen running on the new site. They are the first thing to test on the preview.
- **Newsletter and contact forms end to end.** The Worker route has tests and the contact form uses the
  standard Web3Forms set-up, but neither has sent a real message yet.
- **Pages CMS.** The content is shaped for it, but the editor itself (`.pages.yml`) is Phase 4.

## For Andy to do

1. Put the site on a preview address: `docs/preview-setup.md`.
2. Export the form submissions from Webflow (the footer sign-ups are only stored there).
3. Look through `docs/conversion-report.md`: the map guide places matched to restaurants, especially the few
   marked "please confirm".

## Open questions

1. **Two portrait photos in a row now sit side by side automatically.** That matches how 241 photo pairs
   already looked. It also pairs up 35 spots where two portrait photos were stacked before, and un-pairs 5
   where the photos weren't both portrait. Say if you'd rather mark pairs by hand.
2. **Dates in structured data.** "Published" is now the day the item was first created and "modified" the day
   it was last edited, both in the standard format. Webflow gave "published" as the day of the last publish.
3. **Structured data author.** Guides and reviews name "Andy" as the author, as the brief asked. Guest posts
   name the guest author.
4. **Google Analytics.** GA4 is kept and only loads on the built site. Cloudflare Web Analytics could replace
   or join it.
5. **Restaurants shown on a destination page.** The first 8, by popularity, with the rest in the map. Webflow showed 4.

## Decisions made with Andy (12 November 2026)

- The site lives in this repository, built on the Lumos for Astro starter. Not pixel-identical: Lumos defaults
  are used where they fit.
- Editor: Pages CMS. Guides are plain Markdown with shortcuts (`docs/writing-guide.md`).
- Images stay in the repository (`public/media`).
- Foodie guides and map guides share one listing at `/articles`; every guide keeps its URL.
  `/map-guides-itineraries` redirects to `/articles`.
- Listing filters, in order: search, guide type, category (categories of the other guide type grey out),
  destination grouped by country.
- Navigation: Destinations (dropdown with "All destinations"), Vegan Foodie Guides, About, Shop button. No search.
- `/destinations`: Australia, Japan, Thailand, More Destinations. Cards show guide and place counts and the
  book badge. The card links to the destination, with no separate link to its main guide.
- Home, destination, restaurant and guide pages each show one combined list of guides.
- Contact form: Web3Forms. Newsletter: Kit, through the email Worker.
- Hosting: Cloudflare Worker with static assets (`wrangler.jsonc`).
- The repository stays public until launch (drafts are visible in it until then).
