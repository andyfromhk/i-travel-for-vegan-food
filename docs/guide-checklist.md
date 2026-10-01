# guide.js: setup and test checklist

## guide.js v1.2.1 (you are here)

Two mobile fixes, released together with destination.js as `v1.5.0`. The steps and tests are in
`docs/destination-checklist.md` (Part B1 and the "guide.js v1.2.1 (phones)" tests).

- My location sits in the top-left corner of the map on phones (your menu button covers the top right).
- Article rows with a restaurant name and Save button now take the heading's side margins too, so they line up
  with the text on phones.

---

## Upgrading to guide.js v1.2.0 (done)

Only guide.js changes. core.js stays on `@v1.3.0`.

### Steps

1. [ ] Upload `guide.js`, `README.md` and `docs/guide-checklist.md` to GitHub, then create a release tagged **`v1.4.0`**.
2. [ ] **Articles template** and **Map Guides template** (Before `</body>` tag): change the guide line from
       `@v1.3.0` to `@v1.4.0`.
3. [ ] Publish to staging, run the tests below, then publish to your domains.

### Tests: articles

- [ ] **Save this guide** sits under the short description, not between the title and the description.
- [ ] Each restaurant's **Save** button is on the same line as its name, on the right and vertically centred.
      Long names wrap while the button stays on the right, also on a phone.
- [ ] Spacing above and below restaurant names looks the same as before. (The name's own spacing moves to the
      new row. If anything looks tighter or looser, tell me which article.)
- [ ] The table of contents still jumps to and highlights restaurant headings, and closed badges still appear
      next to the names of closed restaurants.

### Tests: map guides

- [ ] The walking companion card and the **Mark as visited** buttons are gone from route guides.
- [ ] **Open in Google Maps** appears inside each route block (e.g. "10-minute walk"). It opens Google Maps with
      directions from that stop to the next. Walking legs open in walking mode, subway legs in transit, and legs
      that say "walk or subway" let Google Maps suggest the best way. This works from anywhere, which is handy
      when planning from home.
- [ ] With **My location** off, each place shows just **Save**.
- [ ] Turn **My location** on near the places (your Brisbane guides are ideal): each place with a location gets
      a blue **Directions** button next to Save, alongside the blue walking time.
- [ ] **Directions** opens Google Maps from where you are to that place: walking when it's under 3 km away,
      otherwise Google Maps suggests the best way (usually transit).
- [ ] Walk around: the Directions buttons keep starting from your current position.
- [ ] Far from the places (e.g. a Tokyo guide from Brisbane): no Directions buttons and no walking times, and a
      message explains they'll appear when you're nearby.
- [ ] Turn **My location** off: the Directions buttons disappear.
- [ ] Chains ("Multiple locations") have no Directions button (there's no single place to go to).
- [ ] List guides (e.g. the Tokyo bakeries) have Save and Directions, and no route blocks.

---

## Upgrading to guide.js v1.1.0 and core.js v1.2.0 (done)

This release adds Save buttons in guides, "Save this guide", the walking companion, "My location", and the
note for chains on the map. core.js gains the location helper that "My location" uses.

### Steps

1. [ ] Upload `core.js`, `guide.js`, `README.md` and `docs/guide-checklist.md` to GitHub, then create a release
       tagged **`v1.3.0`**.
2. [ ] **Site settings > Custom code > Footer:** change the core line from `@v1.1.1` to `@v1.3.0`.
3. [ ] **Articles template** and **Map Guides template** (Before `</body>` tag): change the guide line from
       `@v1.2.0` to `@v1.3.0`.
4. [ ] Optional: to choose where "Save this guide" appears, add an empty Div Block in each template with the
       attribute `data-vt-save-guide-slot` = `1`. Without it, the button sits under the page title.
5. [ ] Publish to staging, run the tests below, then publish to your domains.

Both scripts must be updated together: "My location" needs core.js v1.2.0. (With an older core it simply
doesn't appear; nothing breaks.)

### Tests: map guides

- [ ] **Chain note.** In the Tokyo bakeries guide, scroll to a chain (e.g. OVGO Baker): a box on the map says
      "OVGO Baker has multiple locations". It goes when you reach the next place.
- [ ] **Save buttons** appear under each place's info line. Save one that has a restaurant page: it also shows as
      Saved on that restaurant's page (it's the same saved item).
- [ ] In **Saved**, a place saved from a guide opens its exact Google Maps listing (your address link) and has
      **In the guide**, which jumps back to that place in the guide.
- [ ] **Save this guide** sits under the title (or in your slot) and appears under "Saved guides".
- [ ] **Walking companion** on the Brisbane walking tour, the Nara day trip and the Tokyo 3-day itinerary:
  - [ ] A card above the first stop: "0 of N stops visited".
  - [ ] Each stop has **Mark as visited**. Ticking it updates the progress bar and fades that marker on the map.
  - [ ] **Next stop: …** opens that place's Google Maps listing (choose walking or transit there).
  - [ ] **Walking route** opens Google Maps directions through the rest of that day's stops. (Google allows up
        to 9 stops in between; on a phone browser without the Google Maps app it may show fewer.)
  - [ ] Finishing a day (Tokyo) shows "Day 1 complete"; finishing everything shows the final message.
  - [ ] Reload the page: your ticks are remembered. **Start over** clears them.
- [ ] **My location** (top right of the map; a round icon on phones):
  - [ ] The browser asks for permission only after you tap it.
  - [ ] A blue dot shows where you are, the map shows you and the nearest place, and each place gets a blue
        walking time in its info line, e.g. "6 min walk".
  - [ ] Walking around updates the dot and times. Tap again to turn it off.
  - [ ] On a guide far from you (e.g. Tokyo from Brisbane), you get "You're far from these places" instead of
        distances. Your Brisbane guides are ideal for testing real distances; to fake a location on desktop,
        use Chrome DevTools > More tools > Sensors > Location.
  - [ ] If you block the permission, a message explains how to allow it.
- [ ] Everything from v1.0.0 still works (spot-check scrolling, routes, day buttons and marker taps).

### Tests: articles

- [ ] **Save buttons** under restaurant and cafe headings: e.g. the Chiang Mai guide (under the "Vegan | Old Town"
      line), the Japan day trips guide and the Brisbane CBD guide.
- [ ] Headings that aren't places (e.g. "Location", "Tips", city headings like "Nara") have no button.
- [ ] Places under a city heading are saved to that city (in the Japan day trips guide, Onwa appears under
      **Nara** in Saved).
- [ ] **Save this guide** under the title.
- [ ] If a Save button appears somewhere it shouldn't, or is missing from a place, tell me the page and heading.
      Places are recognised by their restaurant link, Google Maps link, "Vegan | Area" line or Instagram link.

---

# guide.js v1.0.0: first-time setup (already done)

guide.js replaces four things: the Refokus rich text script, the table of contents and image pair scripts on
Articles, and the old map script plus its three GSAP libraries on Map Guides. Everything should look and behave the
same, except for the changes listed in Part D.

Nothing changes on your live site until Part E.

---

## Part A: Release on GitHub

- [ ] Upload `guide.js`, the updated `README.md` and the two new files in `docs/` (`guide-checklist.md`, `writing-guide.md`).
- [ ] Create a release with the tag **`v1.2.0`**.
- [ ] Check this address shows compressed code, not an error:
  `https://cdn.jsdelivr.net/gh/andyfromhk/i-travel-for-vegan-food@v1.2.0/guide.min.js`

Your core script line in Site settings stays at `@v1.1.1`. (A tag is a snapshot of the whole repository, so
`v1.2.0` contains the same core.js plus the new guide.js. See the README.)

---

## Part B: Map Guides template (Page settings > Custom code)

**Inside `<head>` tag:** delete the Refokus line:

```html
<script defer src="https://tools.refokus.com/rich-text-enhancer/bundle.v1.0.0.js"></script>
```

**Before `</body>` tag:**

- Keep the `ad-management` line (your call), the JSON-LD `<script type="application/ld+json">` block and the `<style>` block.
- Delete these five lines/blocks:
  - `<script async defer src="https://maps.googleapis.com/maps/api/js?...callback=initMapGuide...">`
  - the three GSAP lines (`gsap.min.js`, `ScrollTrigger.min.js`, `ScrollToPlugin.min.js`)
  - the long `<script>` that starts with `(function(c,d){const Z=b,e=c();` (the old map script)
- Add, at the end:

```html
<script defer src="https://cdn.jsdelivr.net/gh/andyfromhk/i-travel-for-vegan-food@v1.2.0/guide.min.js"></script>
```

**Optional tidy-up of the `<style>` block.** guide.js now brings its own styles for everything it creates, and they
take priority, so these rules in Webflow do nothing any more and can be deleted whenever you like:
`.map-marker`, `.map-marker.active`, every `.marker-tooltip` rule, `.route-tooltip-marker-content` (and `.visible`),
`.end-of-day-overlay-content` (and `.visible`), `.day-button-disabled`, every `.location-info-line` rule, and inside
the `@media` block the three lines for `.marker-tooltip`, `.marker-tooltip .listing-title` and
`.route-tooltip-marker-content`.

Keep everything else: `.article-map`, the `.guide-rich-text` image rules, `.route-info…`, `.end-of-day`,
`.text-with-lines`, `.flanking-line`, and the `@media` lines for `.route-info` and `.end-of-day`. Those style your
page and the blocks inside your guide text.

---

## Part C: Articles template (Page settings > Custom code)

**Inside `<head>` tag:** keep the Flowbase line and the `<style>` block, but delete its last, unfinished rule:

```css
.w-richtext figure.w-richtext-align-center {
```

(It has no closing `}` and does nothing.)

**Before `</body>` tag:**

- Keep the JSON-LD block.
- Delete:
  - `<script src="https://tools.refokus.com/rich-text-enhancer/bundle.v1.0.0.js"></script>`
  - the `<script>` starting `const observer = new IntersectionObserver(`
  - the `<script>` starting `document.getElementById("content").querySelectorAll(` (the table of contents)
  - the `<script>` starting `document.addEventListener('DOMContentLoaded', function() { const figures =` (image pairs)
- Add, at the end:

```html
<script defer src="https://cdn.jsdelivr.net/gh/andyfromhk/i-travel-for-vegan-food@v1.2.0/guide.min.js"></script>
```

---

## Part D: Test on staging

Publish to **itravelforveganfood.webflow.io only**. Add `?vtdebug=1` to a page address and open the console (F12)
to see any errors.

### What's meant to change

- [ ] **Intro message.** On a map guide, "Scroll the guide to explore the map" stays while you scroll through the
      introduction, and disappears when the first place reaches the upper part of the screen.
- [ ] **Tooltip width.** On a place with a long veg type and a price (e.g. Good Vegan Options, $$), the pill and the
      price sit on one line. Long place names still wrap neatly.
- [ ] **Zooming back in.** After a route overview zooms the map out, reaching the next place zooms back in to street
      level (unless you'd zoomed in further yourself).

### Map guides: same as before

Test on the Brisbane walking tour (routes and days) and the Tokyo bakeries (list).

- [ ] Each place's heading has its line underneath: district | veg type | price (chains: "Multiple locations").
- [ ] As each place reaches the upper part of the screen, its marker lights up, its tooltip shows and the map glides to it.
- [ ] Sights have grey camera markers; restaurants have coloured markers by veg type.
- [ ] Route blocks: a curved green line with arrows appears between the two places, with the travel label in the
      middle and both tooltips showing; the map fits both places.
- [ ] Scrolling back up past a route block returns to the place before it.
- [ ] End of day blocks: the markers go quiet and your end-of-day message appears on the map.
- [ ] The day counter changes as you pass each end-of-day block; the previous/next day buttons jump between days and
      grey out at the first and last day.
- [ ] Tapping a marker scrolls the guide to that place.
- [ ] The bakeries guide has no day counter.
- [ ] On a phone: the guide scrolls in its own panel under the map, the active marker sits slightly below the map's
      centre, and on route guides the tooltips show just the name.

### Articles: same as before

- [ ] The table of contents lists the same headings; clicking one jumps to it; the highlight follows as you read.
- [ ] Old links to a section still work, e.g. `/articles/vegan-chiang-mai-guide#where-to-stay-in-chiang-mai`.
- [ ] Tip boxes and dividers in existing guides look exactly as before (check a guide with several icons, like the
      Japan day trips guide).
- [ ] Two centred images in a row still sit side by side.
- [ ] Price pills, closed badges and the phrase card (from core.js) still appear.

### Try the new writing shortcuts

- [ ] In a published article, add a block quote starting with 🎫 and a paragraph with just `---`. Publish to staging:
      you should see a ticket tip box and a divider. (Keep them or remove them afterwards.)

---

## Part E: Go live

- [ ] Publish to your custom domains.
- [ ] Spot-check one article and one map guide on the live site.

If anything goes wrong, put the old lines back from your Webflow backup (or remove the guide.js line and restore the
old scripts) and publish. Every change here is in the two templates' custom code, so it's easy to reverse.
