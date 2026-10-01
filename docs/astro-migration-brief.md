# Migration brief: I Travel For Vegan Food, from Webflow to Astro + Cloudflare Pages

## For Andy: how to use this brief

1. Create a **new, empty GitHub repository** for the new site (for example `itfvf-site`) and clone it to your computer.
2. Save this file in the repository's root folder as **`MIGRATION_BRIEF.md`**.
3. Open Claude Code in that folder and send:

   > Read MIGRATION_BRIEF.md carefully. We'll work through it phase by phase. Start with the "Before you start"
   > checklist and Phase 0, use plan mode, and stop at each checkpoint for my approval.

4. Keep the scripts repository (`andyfromhk/i-travel-for-vegan-food`) as it is: Claude Code uses it as a
   reference, and the "Email me my list" Worker lives in its `worker/` folder.

Everything below is written to Claude Code.

---

## 1. Your role and how to work

You're migrating a **live website that ranks well in search**. Protect, in this order:

1. **Search traffic:** every existing URL keeps working with the same content, titles and metadata.
2. **Content and data:** nothing is lost, including drafts, closed restaurants, photo credits and alt text.
3. **Features:** everything readers can do today still works.
4. **Maintainability:** the owner, Andy, runs the site alone and is learning to code.
5. **Performance.**

How to work:

- **Phases and checkpoints.** Work through the phases in section 7. At every **checkpoint**, stop, summarise
  what you did and what you found, list the decisions Andy needs to make, and wait for his approval.
- **Plan first.** Start each phase in plan mode and share the plan before changing files.
- **Explain as you go.** Andy likes to understand and learn. Explain decisions in plain language, keep code
  readable with short comments, and write documentation in `docs/`.
- **Read-only on Webflow.** Never write to Webflow, and never change DNS or live settings. Andy performs the
  launch steps himself, from checklists you write.
- **Secrets.** Keep them in `.env` (gitignored) and document the variable names in `.env.example`. Never commit,
  print or log secrets.
- **Git.** Use a branch per phase, small descriptive commits, and pull requests if the GitHub CLI is available.
- **Ask first** before adding a paid service, a large dependency, or anything that changes a URL.
- **Check current facts.** Verify versions and behaviour of Astro, Cloudflare Pages/Workers and Webflow's API in
  their official docs rather than relying on memory. When something here conflicts with current docs, tell Andy.

---

## 2. Before you start: what Andy needs to provide

Make this a checklist in `docs/setup.md`, and help Andy through each item:

- [ ] **Webflow API token, read-only.** It needs read access to Sites, Pages, CMS and Assets. It's generated in
      Webflow's site settings, under apps and integrations / API access (check the current path in Webflow's
      docs). It goes in `.env` as `WEBFLOW_TOKEN`. Site ID: `60cbefb367e06dd6b12c5204`.
- [ ] **Node.js (LTS) and Git** installed.
- [ ] **Cloudflare account access.** Andy already has an account with other migrated sites; use the same account.
- [x] **DNS is already on Cloudflare.** The domain's nameservers moved from GoDaddy to Cloudflare before the
      migration (GoDaddy remains the registrar). The `www` and apex records still point to Webflow, as
      **DNS only** (grey cloud). The account is on the **Workers Paid** plan.
- [ ] **The reference scripts repository**, cloned to `reference/scripts` (read-only, gitignored or a submodule):
      `https://github.com/andyfromhk/i-travel-for-vegan-food`

---

## 3. About the site

**itravelforveganfood.com** is a vegan travel food guide site. All writing and almost all photos are Andy's; a
few photos are credited to restaurants, and those credits must be kept. The canonical host is
`www.itravelforveganfood.com`, and Webflow staging is `itravelforveganfood.webflow.io`.

### Content (Webflow CMS)

Enumerate **all** collections through the API. The main ones are:

| Collection | Webflow ID | Notes |
|---|---|---|
| Restaurants | `63cca2133f5ddf74a0876843` | About 349 items: about 239 published, about 107 drafts, a few archived. Fields include name, name in original language, slug, latitude/longitude (plain text), address, phone, website, Instagram, city (reference to Destinations), veg type, price range, venue type and cuisine (references), featured photo, gallery, description (rich text), meta description, **Status** (option: Open / Temporarily closed / Permanently closed; empty means open), **Chain** (switch), **Store Locator** (link), **Google Map Share Link** (link) |
| Articles | `63cca2133f5ddf9f93876844` | 61 items. Introduction, content and destination recommendations (rich text), category, featured, featured image, gallery, guest author, intro text, "link to map" switch, meta description, referenced cities (multi-reference), TOC headings ("h2,h3") |
| Map Guides | `67fdc4fccb04b2f6b03452ad` | 7 items. Content (rich text with embeds), "Display Routes?" option, featured image, focus ("City Map Guide" / "Local Walks"), referenced destination, short description |
| Destinations | `63cca2133f5ddf6edd876842` | 24 items (one archived: Sunshine Coast). Country reference, "Restaurants?" and "Itinerary?" switches |
| Countries | `66a6f90161cdac0a20c3a035` | Has a Destinations multi-reference, which duplicates Destination → Country |

There are also reference collections: veg types, price ranges, venue types, cuisines, categories, and any others
the API lists.

### URLs to preserve exactly (Webflow uses no trailing slash)

- `/articles/{slug}`, `/map-guides/{slug}`, `/destinations/{slug}`, `/restaurants/{slug}` and any other
  collection template URLs
- All static pages (home, index pages, shop, about, legal and so on). Get the full list from the Pages API **and**
  the live `sitemap.xml`.

### Custom code already written

The reference scripts repository contains the site's behaviour, served today from jsDelivr:

- **`core.js`** (every page):
  - saved places and guides, stored in localStorage, with a drawer, share and copy
  - the vegan phrase card (6 languages)
  - the price converter
  - closed-restaurant badges
  - captions from image alt text and the back button
  - a toolbox: Google Maps loader, location helper, veg colours
- **`guide.js`** (Articles and Map Guides):
  - tip and divider shortcuts, including compatibility with the old Refokus shortcodes
  - table of contents and image pairs
  - the scroll-synced Google Map on map guides, with routes, days, chain notes and markers
  - Save buttons, "Save this guide", "My location" with walking times and Directions, and per-leg directions
- **`destination.js`** (Destinations):
  - the fullscreen restaurant map, integrated with Finsweet filter and sort
  - hearts on cards, map tooltips and the page's restaurant grid
  - the "Saved" tag, "Distance from Me" sorting, and tooltips that open restaurant pages
- **`docs/`**: checklists describing every behaviour. **Treat these checklists as acceptance tests** for the
  new site, plus `docs/writing-guide.md`, which covers the authoring shortcuts.

These scripts were built against Webflow's HTML and class names. On the new site, **port the behaviour**; don't
reproduce Webflow's markup just to keep them running (unless Andy chooses the fast path in section 6).

### Must stay compatible, so readers keep their saved lists

- localStorage keys: `itfvf:saved`, `itfvf:home-currency`, `itfvf:rates`
- saved item IDs: `place:{restaurant-slug}`, `place:{destination}-{slugified-name}` (places without a restaurant
  page), `guide:{path}`
- **The "Email me my list" Worker.** It lives in the reference repository's `worker/` folder, is served at
  `api.itravelforveganfood.com`, and sends through **Cloudflare Email Sending**. It keeps running unchanged
  through the migration. Add the new site's addresses (the `pages.dev` preview and production) to its allowed
  origins (`ALLOWED_ORIGINS` in `worker/wrangler.jsonc`) and to the Turnstile widget's hostnames. Point its
  `LOGO_URL` at the logo on the new site (it currently uses Webflow's CDN). Keep the Saved drawer's
  "Email me my list" form working: it POSTs `{ email, optIn, token, items }` to
  `https://api.itravelforveganfood.com/email-list` with a Turnstile token (site key in `core.js`).

### Rich text conventions you'll meet during conversion

- **Old Refokus shortcodes:** `[.divider][.divider]` becomes a divider, and
  `[.tips][.icon-X][.icon-X][.div]…[.div][.tips]` becomes a tip box. There are 13 icons: idea, camera, ticket,
  compass, food, website, location, hotel, cutlery, book, money, discount, phone-heart.
- **Newer shortcuts:** a paragraph containing only `---` is a divider. A block quote is a tip box, and its leading
  emoji picks the icon (the list is in `writing-guide.md`).
- **Map guide embeds**, custom HTML inside the rich text:
  - `.location-trigger` with `data-lat`, `data-lng`, `data-veg-type`, `data-price-range`, `data-district`. The
    district may say "Multiple locations" for chains, which have no coordinates.
  - `.route-info` with `data-travel-mode` and `data-travel-info`.
  - `.end-of-day` (its text is the end-of-day message).
- **Other formatting:**
  - Instagram embeds (block quotes inside embeds, which are **not** tips)
  - consecutive centred figures shown as image pairs
  - `.images` blocks whose captions come from alt text
  - a "Vegan | Old Town" line under restaurant headings in some articles
- **Links:** affiliate links (Trip.com, Klook, GetYourGuide, Expedia, Viator, Booking, Airalo and similar) must be
  kept exactly, including `rel` attributes.

### DNS records that must never be removed

The domain is on Cloudflare DNS, and some records have nothing to do with the website:
- **Email Sending:** records on the `cf-bounce` subdomain (MX and TXT) and the DMARC record on `_dmarc`
- **Email Routing:** MX and TXT records on the main domain, if Andy has set up a forwarding address such as
  `hello@`
- **The Worker's custom domain:** `api`
- **Verification TXT records:** Google, Kit and others

List them in the inventory, and make sure no step in the launch checklist touches them.

### Third parties on the current site (confirm during the inventory)

- Google Maps JavaScript API (key restricted by HTTP referrer; Map ID `7ffd42eb279d407c` with cloud styling)
- Finsweet Attributes on destination pages: CMS Filter, CMS Sort and CMS Slider. **None of these will be used
  on the new site** (see Phase 2).
- Flowbase share buttons (and possibly ShareThis)
- Kit newsletter forms
- JSON-LD in the templates (Article; Restaurant/Review)
- the shop page for Andy's PDF travel books

---

## 4. Target stack

- **Astro** (current stable), static output.
- **Hosting:** Cloudflare Pages in Andy's existing account, deployed from GitHub. If Cloudflare's current guidance
  recommends Workers with static assets instead, explain the trade-offs at Checkpoint 1. Default to Pages unless
  there's a clear reason.
- **Content in the repository,** as Astro content collections with schemas: MDX for long-form writing, JSON or YAML
  for data.
- **Editing interface,** decided at Checkpoint 1. Recommend one after the inventory; Keystatic (Git-based, free,
  Astro-friendly) is the default candidate. Alternatives: Decap, TinaCMS, Sanity (Andy has an account). The content
  format must not depend on the editor.
- **Images:** download **every** image, CMS and site assets alike. After measuring the total size, propose where to
  keep them (in the repo with Astro's image pipeline, or in Cloudflare R2). Never hotlink Webflow's CDN
  (`cdn.prod.website-files.com`) after launch.
- **Client-side JavaScript:** small, focused scripts or islands, with no heavy UI framework. Load Google Maps only
  when a map is actually shown or opened.

---

## 5. Target content model (agreed with Andy)

Refine field names and details as needed, but don't change these principles without asking.

- **`places`:** one record per physical place (restaurant, cafe, bakery, market stall, sight, and so on).
  - Fields: name, name in original language, slug, destination, area/district, venue type, veg type, price range,
    cuisines, location `{lat, lng}`, address, `mapsUrl` (the Google Map Share Link), website, Instagram, phone,
    `status` (open / temporarily-closed / permanently-closed), closed since (optional), `chain`, `storeLocator`,
    and `page` (true when the place has a review page at `/restaurants/{slug}`).
  - A place with a page has a review body (MDX), photos with credits, and dates.
  - Places mentioned in map guides that have no restaurant record become places with `page: false` (sights and
    similar). Nothing gets a thin public page it didn't have before.
- **`destinations`** belong to **`countries`**. A country holds its currency code, its phrase-card language key,
  and its book/shop link. Drop the duplicated Countries → Destinations reference and derive it instead.
- **`guides`:** **one** collection for Articles and Map Guides, with `format: article | map-guide | route-guide`,
  while **keeping each guide's existing URL** (`/articles/…` or `/map-guides/…`) through routing.
- **Guide bodies (MDX)** use components:
  - `<Place id="neon-ramen" />` where a place section starts. It renders the info line (district | veg type |
    price), the Save button, the map marker data and any closed badge, all from the place record.
  - `<Route mode="walk">10-minute walk to Vega Cafe</Route>` and `<EndOfDay>Day 1 done!</EndOfDay>`
  - `<Tip icon="ticket">…</Tip>`; plain `---` for dividers; `<ImagePair>`; `<Instagram>`
- **Taxonomies:** veg types with their colours (vegan `#5a8707`, vegetarian `#6c57ac`, good vegan options
  `#e9942d`, limited vegan options `#7a1616`, fallback `#333333`), price ranges, venue types, cuisines, categories.
- **Drafts** are kept with `draft: true` and not built. **Archived** items are exported to an archive folder and
  not built.
- **Closed places** keep their pages with a closed banner. They're excluded from lists and maps, and every guide
  that mentions one shows a badge, derived at build time.

---

## 6. One early decision: the fast path or the full path

Present both options at Checkpoint 1:

- **Full path (recommended):** new templates, the content model above, and the script behaviour ported into the
  site's own components.
- **Fast path (fallback):** reproduce Webflow's HTML and class names closely enough that the three existing scripts
  (and Finsweet) run unchanged, then modernise in a second project.

Estimate the effort and risk of each.

---

## 7. Phases and acceptance criteria

### Phase 0: Discovery and inventory (read-only)

- Scaffold the repository (no site yet): `README.md`, `.gitignore`, `.env.example`, `docs/`, `migration/`.
- Using the Webflow Data API v2 (read-only), export:
  - site info
  - all pages, static and templates, with SEO and Open Graph settings
  - every collection's schema and **every item, including drafts and archived items**
  - the asset list

  Save the raw JSON under `migration/export/`. Respect the API's rate limits.
- Politely crawl every URL in the live `sitemap.xml` (rate-limited) and record:
  - status, title, meta description, canonical, Open Graph tags, JSON-LD and H1
  - the third-party scripts on each page type

  Save the results under `migration/crawl/`.
- Write **`docs/inventory.md`**, covering:
  - collections, fields and item counts
  - the full URL list with status
  - static pages
  - forms and where they submit (Kit? Webflow forms?)
  - embeds (Instagram, YouTube and so on)
  - affiliate domains
  - custom code per template
  - image count and total size
  - the shop setup
  - anything surprising
- Write **`docs/migration-plan.md`**, covering:
  - the architecture
  - an old → new field mapping for every collection
  - the editor recommendation
  - the image storage recommendation
  - the fast vs full path estimate
  - risks and open questions

**Checkpoint 1:** Andy reviews both documents and decides on the editor, image storage, path, and open questions.

### Phase 1: Content conversion

- Write re-runnable, idempotent conversion scripts in `migration/scripts/` (TypeScript/Node) that turn the export
  into content collection files:
  - **Rich text to MDX:** headings, lists, links, bold and italic, figures with alt text and captions, alignment,
    embeds, and a clean, readable output.
  - **Shortcuts to components:** old shortcodes and the newer shortcuts become components.
  - **Map guide embeds to components:** they become `<Place>` / `<Route>` / `<EndOfDay>`. Match a place to a
    restaurant record by the `/restaurants/` link in its section first, then by name within the same destination.
    Anything unmatched becomes a `page: false` place.
  - **Data:** references become slugs, option fields become enums, and dates become ISO.
  - **Images:** downloaded with their alt text and credits, and references rewritten.
- Produce **`docs/conversion-report.md`**, covering:
  - item counts per collection, old vs new
  - items with conversion warnings
  - place matches for Andy to confirm
  - unmatched places
  - broken internal links
  - images missing alt text
  - anything that didn't convert

**Checkpoint 2:** Andy reviews the report and a sample of converted guides of each format (for example the Brisbane
walking tour, the Tokyo bakeries guide, the Japan day trips article and the Chiang Mai guide).

### Phase 2: Build the site with parity

- **Templates for every page type**, matching the current design: fonts, colours, spacing and components. Use the
  live site as the reference. Aim for close, not pixel-perfect, and show side-by-side screenshots at desktop and
  phone widths.
- **Port all behaviour**, using the reference repository's checklists as acceptance tests:
  - **Saved places:** same storage keys and IDs.
  - **Phrase card and price converter.**
  - **Closed badges:** at build time where possible.
  - **Table of contents:** with the **same heading IDs** as today, so shared `#anchor` links keep working. The
    old recipe is in `guide.js`.
  - **The map guide's scroll-synced map:** routes, days, chain note, My location, Directions and per-leg
    directions.
  - **The destination page's fullscreen map:** hearts, the Saved tag, Distance from Me, and tooltips that open
    restaurant pages.
- **No Finsweet at all.** Replace each of its three parts with the site's own code:
  - **CMS Filter:** the filter modal, the active-filter tags, the results count and the scroll-to-list behaviour.
    Filter with the restaurant data the page already has from the build.
  - **CMS Sort:** the sort dropdown and its options, including "Distance from Me".
  - **CMS Slider:** the destination photo gallery. It only exists because Webflow sliders can't be connected to the
    CMS; on Astro, build the slides straight into the page.

  Match the current behaviour and look. Record the Finsweet settings in the inventory (filter fields, sort fields,
  and any options such as how filters combine).
- **Google Maps:** same Map ID, loaded on demand. List every domain Andy must add to the API key's referrer
  restrictions, including the `pages.dev` preview address.
- **SEO parity:**
  - identical URLs with **no trailing slash**. Configure Astro accordingly, and verify on a real Cloudflare Pages
    preview that `/path` returns 200 with no redirect.
  - identical titles and meta descriptions, canonicals, Open Graph and Twitter tags
  - JSON-LD: Article with ISO dates, author "Andy" as a Person, and the publisher as an Organization; Restaurant
    with geo, address and cuisine for restaurant pages; BreadcrumbList
  - `sitemap.xml`, `robots.txt`, a proper 404 page, favicon and manifest
- **Everything else:**
  - Kit newsletter forms
  - lightweight share buttons (no heavy third-party script)
  - affiliate links unchanged
  - analytics: propose Cloudflare Web Analytics, and ask Andy about Google Analytics
- **Quality:**
  - Lighthouse (mobile) of 90 or above on the key templates
  - responsive images (AVIF/WebP)
  - lazy loading
  - no layout shift from buttons that scripts add
  - accessible buttons, labels and focus states

**Checkpoint 3:** deploy a preview to Cloudflare Pages (`*.pages.dev`). Andy tests it with the checklists.

### Phase 3: Editing workflow

- Set up the chosen editor.
- Write **`docs/editing-guide.md`**, with screenshots, covering:
  - adding a restaurant (including chains, the Google Map Share Link and photo credits)
  - writing an article, a map guide and a route guide (the components and shortcuts)
  - marking a place closed
  - adding a destination or country
  - previewing and publishing

**Checkpoint 4:** Andy creates a test restaurant and a test guide end to end, then deletes them.

### Phase 4: Pre-launch checks

- **URL parity report:** every URL in the old sitemap, plus every internal link, returns 200 on the preview with
  the same title and meta description. Any intentional change needs a 301 in `_redirects` (there should be none).
- **Link checks:** internal and external links, images, and structured data validity.
- **Feature checklists:** everything from the reference repository passes, on desktop and on a phone.

**Checkpoint 5:** go / no-go.

### Phase 5: Launch (Andy performs the steps from your checklist)

Write **`docs/launch-checklist.md`**, covering:

- **Before the switch:** download a copy of the current DNS records (Cloudflare can export the zone file) and
  write down the exact Webflow records. Restoring them is the rollback.
- **Records to leave alone:** everything in "DNS records that must never be removed" (section 3).
- **The switch:** remove only the records that point `www` and the apex to Webflow. Then add both hostnames as
  custom domains on the Pages project, which makes Cloudflare create the new records. Set the apex to redirect to
  `www`, and check HTTPS on both hostnames.
- **Search Console:** submit the sitemap.
- **Update allowed domains** in:
  - the Google Maps key restrictions
  - the Turnstile hostnames
  - the email Worker's allowed origins
- **Keep Webflow as the fallback:** leave the Webflow site published on `webflow.io` and the plan active for 2–4
  weeks. Putting the saved Webflow records back is the rollback, and takes minutes.
- **Monitoring:** check Search Console coverage and the list of 404s daily for two weeks. Fix anything within a day.

---

## 8. Out of scope unless Andy asks

- redesigns
- new features beyond what's listed
- URL changes
- ads or other monetisation changes
- changing the newsletter provider

Suggest improvements freely, but separately from the migration work.
