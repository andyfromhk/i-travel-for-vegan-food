# Migration status

Where the Webflow → Astro (Lumos) migration stands. Branch: `astro-migration`.
The original brief is `docs/astro-migration-brief.md`; the decisions made since are at the bottom of this page.

## Done (Phases 0 to 3, and Round 2)

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
- **Round 2 design changes** from the first preview (mega menu, page spacing, listing filters, About, Shop,
  destination and restaurant pages, lightbox, sticky map guide map).

## Done (Phase 4: Pages CMS)

- **`.pages.yml`** sets up the editing screens: Restaurants, Vegan Foodie Guides, Map Guides & Itineraries,
  Destinations, Authors, Pages, Book promos and Shop page. Drop-downs for veg type, price, venue type, cuisine,
  category and country; destinations and authors are picked from a searchable list.
- **How to use it:** `docs/editing-guide.md`.
- **Tested against Pages CMS's own code:** the config passes its validator with no errors; every guide and
  review was run through its editor and back (the shortcodes, captions and tip boxes all survive; it only
  re-spells things like `&` as `&amp;`, which look the same on the page); and its date format keeps every
  existing date.
- **Safety nets in the build:** a restaurant or guide pointing at a destination, author, cuisine and so on that
  doesn't exist stops the build with a plain message (it found one: Nurcha Kawana pointed at the archived
  Sunshine Coast destination, so it now has no destination, as on the live site). A photo added through the
  CMS gets its size read from the file. A half-filled photo or map pin is skipped instead of failing the build.
- **Content tidy-ups found on the way:** 13 guides showed a stray backslash where the old site had a line break
  ("Hours:\\"), and a few links had a line break inside them. Both are fixed, in the content and in the
  converter, so running the conversion again reproduces the repository exactly.
- Destinations and authors gained a `slug` field (the same as the file name) so the CMS can link to them.
  `src/data/books.json` is now a list, so the CMS can edit it.

## Done (Phase 5: pre-launch checks and the launch checklist)

- **`docs/launch-checklist.md`**: go / no-go, the content refresh the day before, saving the DNS, the switch,
  checks, rollback, the two weeks after, and tidying up once Webflow is cancelled.
- **Lighthouse** (phone settings, on the local build): home 94 for performance (the live Webflow home page
  scores 68 on the same test), accessibility 96–97, best practices 100, SEO 100 on every page tested. The
  one best-practices point lost on map guides is the Maps key refusing `localhost`.
- **Smaller photos in cards and photo grids.** The build makes a 600-pixel copy of each photo shown small
  and lets the browser choose it, which halved the home page's weight (2.2 MB to 1.1 MB) and its loading
  time on phones (5.9 to 2.9 seconds). The originals and their addresses are unchanged.
- **Caching:** files whose names change with their contents are kept by browsers for a year, photos for a
  week (`public/_headers`).
- **Accessibility fixes:** grey text is darker (it was 3.2:1 against white, below the 4.5:1 guideline);
  photo links all have names; captioned photos aren't described twice; table-of-contents links are big
  enough to tap; destination pages have a heading for the restaurant cards.
- **Structured data:** all 623 blocks on 330 pages are valid JSON with the properties Google asks for.
- **Phones:** no page scrolls sideways at 320, 375, 768 or 1280 pixels wide.
- **How Cloudflare serves it,** tried with Wrangler locally: addresses without `.html`, trailing slashes
  dropped, every redirect, query strings kept through redirects, the 404 page with a 404 status.

## Checked, and how

| Check | Result |
|---|---|
| Build | 330 pages, about a minute (most of it making the photo copies; a rebuild reuses them) |
| Type check (`npx astro check`) | 0 errors, 0 warnings |
| Old URLs (`migration/scripts/check-parity.mjs`) | 348 identical, 2 redirect on purpose (`/map-guides-itineraries`, `/search`), 0 missing |
| Internal links | 18,640 checked; 2 lead nowhere, and both were already broken on the old site |
| Table-of-contents anchors | 665 of 666 kept (the one lost was an empty heading) |
| Email Worker tests | 23 pass (20 existing, 3 new) |
| Map guide markers | all 76 are where they were on the old site |
| Listing filters, map list filters and sorting, Save buttons | tested in a browser on the local build |

## Not checked yet

- **Google Maps itself.** The Maps key only answers `itravelforveganfood.com`, so the real map could not load
  during the build work. The map code was tested against a stand-in for the Maps service instead: every stop
  gets a marker, the map follows the guide as you scroll, each route draws with its label, the end-of-day
  message shows, and on destination pages the markers follow the filters. What has not been seen is the real
  Google map drawing those things, so maps are the first thing to test on the preview.
- **Newsletter and contact forms end to end.** The Worker route has tests and the contact form uses the
  standard Web3Forms set-up, but neither has sent a real message yet.
- **Pages CMS in the hosted app.** The config was checked with Pages CMS's own code, but nobody has signed in to
  app.pagescms.org with it yet. That needs Andy's GitHub account (`docs/editing-guide.md`, "Setting up").

## For Andy to do

1. Put the site on a preview address: `docs/preview-setup.md` (done), and switch on the Maps Embed API there.
2. Set up Pages CMS and try it on the preview: `docs/editing-guide.md`, "Setting up".
3. Go through the go / no-go list in `docs/launch-checklist.md`, then pick a launch day.
4. Export the form submissions from Webflow (the footer sign-ups are only stored there).
5. Look through `docs/conversion-report.md`: the map guide places matched to restaurants, especially the few
   marked "please confirm". Four stops now show what the restaurant's own record says, which differs from
   what the guide said: Hai Hai, Motto Motto and Taro's Ramen (the Brisbane ramen guide said "Good Vegan
   Options", their records say "Limited Vegan Options") and Alaska Zwei (the guide said "$", its record says "$$").

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
6. **The "Good Vegan Options" orange** (`#e9942d`) is faint as text (2.4:1 on white; the guideline is
   4.5:1). It's the only colour Lighthouse still flags on the site's own pages. A darker orange such as
   `#a8600f` (4.8:1) would pass; it's one line in `src/data/taxonomies.json`.

## Decisions made with Andy (13 November 2026)

- Brand green `#558005` (was `#5a8707`), which passes the contrast guideline. Small green text on the yellow
  boxes and the grey footer uses the darker `--brand-600`.
- Photos over 200 KB were shrunk in place (`migration/scripts/compress-media.mjs`): 555 photos, 151 MB to
  83.5 MB, same file names, at most 1,600 pixels wide.

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
