# destination.js: setup and test checklist

## Upgrading to destination.js v1.1.1 (you are here)

Three small visual changes. Only destination.js changes.

1. [ ] Upload `destination.js`, `README.md` and this checklist, then create a release tagged **`v1.6.1`**.
2. [ ] **Destinations template:** change the destination line from `@v1.6.0` to `@v1.6.1`.
3. [ ] Optional tidy-up: your `<style>` block on the Destinations template still says
       `.restaurant-list-item.active { border: 2px solid #5a8707; ... }`. The script's 1.5px border overrides it, but
       you can change it to `1.5px` there too so the two match.
4. [ ] Publish to staging and check:
   - [ ] Saved places show a small **red heart** on their map marker (instead of a dot).
   - [ ] The **Saved** tag's count is white on dark grey (#333) when off, and green on white when on.
   - [ ] Tapping a marker highlights its card with a **1.5px** border in the veg-type colour.
5. [ ] Publish to your domains.

---

## Upgrading to destination.js v1.1.0 (done)

Your own "Distance from Me" sort option and "Saved" tag replace the two buttons the script used to add. Hearts
now also appear on the restaurant grid under "Open map", and tapping a map tooltip opens that restaurant's page
in a new tab. Only destination.js changes.

### Steps

1. [ ] Upload `destination.js`, `README.md` and `docs/destination-checklist.md`, then create a release tagged **`v1.6.0`**.
2. [ ] **Destinations template** (Before `</body>` tag): change the destination line from `@v1.5.0` to `@v1.6.0`.
3. [ ] In the Designer, on the Destinations template (recommended):
   - **"Distance from Me" dropdown link:** add the custom attribute `data-vt-sort` = `distance`. The script also
     finds the option by its wording, but the attribute keeps it working if you ever rename it. Leave it without
     an `fs-cmssort-field`, as it is now, so Finsweet leaves it to the script.
   - **Saved tag:** on the text block inside `destination-saved-toggle`, remove the attribute
     `fs-cmsfilter-element` = `tag-text`. It came across from Finsweet's tag template; outside the template it could
     make Finsweet treat your Saved tag as one of its filter tags.
   - **Optional:** style the tag's "on" state by adding a combo class **`is-active`** to `destination-saved-toggle`
     (the script adds and removes that class). Until you do, it uses a soft pink look.
4. [ ] Publish to staging, run the tests below, then publish to your domains.

### Tests

- [ ] The extra "Near me" / "Saved" button row under Filters and Sort is gone.
- [ ] **Saved tag:** a heart on the left, "Saved", and a pink count on the right once you've saved places in this
      city. Tap it: only saved cards and markers show, and the tag looks "on". Tap again: everything's back. With
      nothing saved, it suggests tapping a heart.
- [ ] **Distance from Me:** choosing it changes the Sort label to "Distance from Me", asks for your location, then
      sorts the cards nearest first with walking times and a blue dot on the map. Chains go to the end.
  - [ ] Choosing it again later (after walking a while) re-sorts from where you are then.
  - [ ] Choosing any other sort option switches back to that sort.
  - [ ] Far from the city, or with location blocked: a message, and the Sort label goes back to what it was.
- [ ] **Grid under "Open map":** each restaurant photo has a heart in its top-right corner. Tapping the heart saves
      (it doesn't open the page); tapping anywhere else on the card opens the page as before. Saving here or in
      the map's list is the same saved item. The books grid has no hearts.
- [ ] **Map tooltips:** a small arrow icon sits next to the name. Tapping the tooltip opens the restaurant page in
      a new tab; the heart in the tooltip still just saves.
- [ ] Everything from v1.0.0 still works (open/close, markers, locate icon, filters).

---

# destination.js v1.0.0 (and guide.js v1.2.1): first-time setup (done)

This release rebuilds the fullscreen restaurant map on destination pages and adds Save hearts, a "Saved" filter
and "Near me" sorting. It also includes the two mobile fixes in guide.js v1.2.1. core.js doesn't change.

Nothing changes on your live site until Part D.

---

## Part A: Release on GitHub

- [ ] Upload `destination.js`, `guide.js`, `README.md`, `docs/guide-checklist.md` and this file
      (`docs/destination-checklist.md`).
- [ ] Create a release tagged **`v1.5.0`**.
- [ ] Check this address shows compressed code, not an error:
  `https://cdn.jsdelivr.net/gh/andyfromhk/i-travel-for-vegan-food@v1.5.0/destination.min.js`

Script lines after this release:

| Where | Line uses |
|---|---|
| Site settings > Footer (core) | `@v1.3.0/core.min.js` (unchanged) |
| Articles and Map Guides templates (guide) | `@v1.5.0/guide.min.js` |
| Destinations template (destination) | `@v1.5.0/destination.min.js` (new) |

---

## Part B: Webflow

### B1. Articles and Map Guides templates

- [ ] Change the guide line from `@v1.4.0` to `@v1.5.0` on both templates.

### B2. Destinations template (Page settings > Custom code)

**Inside `<head>` tag:** keep the three Finsweet lines (CMS Filter, CMS Sort, CMS Slider).

**Before `</body>` tag:**

- Keep the `ad-management` line (your call) and the `<style>` block. It still styles the markers, tooltips,
  active cards and the sticky map.
- Delete:
  - the long `<script>` that starts with `const _0x57d017=_0x4033;` (the old map script)
  - `<script src="https://maps.googleapis.com/maps/api/js?...callback=initializeMap...">`
- Add, at the end:

```html
<script defer src="https://cdn.jsdelivr.net/gh/andyfromhk/i-travel-for-vegan-food@v1.5.0/destination.min.js"></script>
```

### B3. Optional but recommended: exact links for places saved from the list

Select the restaurant card (`Card` + `restaurant-list-item`) in the Destinations template's collection list and add
these custom attributes:

| Name | Value (bind to CMS field) |
|---|---|
| `data-vt-maps` | Google Map Share Link |
| `data-vt-address` | Address |
| `data-vt-locator` | Store Locator |

Without them, a place saved from the list still works. Its Google Maps link searches by name and city until the
reader visits that restaurant's page, which fills in the exact link.

---

## Part C: Test on staging

Publish to **itravelforveganfood.webflow.io only**. Add `?vtdebug=1` to see any errors in the console (F12).

### guide.js v1.2.1 (phones)

- [ ] Map guide on a phone: **My location** is in the top-left corner of the map, clear of your menu button.
      On desktop it stays top right.
- [ ] Article on a phone: each restaurant name and its Save button line up with the text below, with the same side
      margins as the paragraphs. Desktop looks as before. Rotating the phone keeps them aligned.

### Destination pages: same as before

Test on Sydney or Brisbane (lots of places, a few chains).

- [ ] **Open map** opens the fullscreen map; the page behind doesn't scroll. The close button closes it.
- [ ] Markers are coloured by veg type. Tapping one highlights its card (border in the veg colour), scrolls the
      list to it and shows the tooltip (veg type, price, name).
- [ ] Tapping the map background clears the highlight.
- [ ] A card's **locate icon** zooms the map to that restaurant and shows its tooltip.
- [ ] **Filters:** after applying filters, the markers match the list and the map refits. With one or two results
      the map doesn't zoom in too far. Removing a filter tag brings the markers back.
- [ ] Your **Sort** dropdown works as before.
- [ ] Gallery captions still show.

### Destination pages: new

- [ ] The map loads the first time you open it (a moment's wait on a slow connection is normal). Opening it again
      is instant.
- [ ] **Hearts** sit in the top-right corner of each photo, clear of the locate icon and the "Multiple Locations"
      label. Saving here is the same as saving on the restaurant page (it shows in **Saved**, bottom right).
- [ ] Saved places have a small pink dot on their map marker, and the tooltip has a heart too.
- [ ] **Saved** (under Filters / Sort) shows how many places you've saved in this city. Tap it to see only those
      cards and markers; tap again for everything. With nothing saved, it suggests tapping a heart.
      Note: Finsweet's results count doesn't know about this, so it still shows the filtered total.
- [ ] **Near me** (try it on a Brisbane page, or fake a location with Chrome DevTools > More tools > Sensors):
  - [ ] The browser asks for your location only after you tap it.
  - [ ] Cards are sorted nearest first, each with a blue walking time next to its veg type and price. Chains
        ("Multiple Locations") go to the end.
  - [ ] The map shows a blue dot and fits you and the nearest place.
  - [ ] As you move, the walking times update but the order stays put (so the list doesn't jump around).
  - [ ] Tap **Near me** again to go back to the usual order. Choosing one of your Sort options also turns it off.
  - [ ] On a city you're not in (e.g. Tokyo from Brisbane), you get a message and the order stays as it was.
- [ ] On a phone, the Near me and Saved buttons fit under the Filters / Sort bar.

---

## Part D: Go live

- [ ] Publish to your custom domains.
- [ ] Spot-check a destination page, an article and a map guide on your phone.

**Rolling back:** put the old destination script and Google Maps line back from your Webflow backup (or remove the
destination.js line and restore them), and change the guide lines back to `@v1.4.0`.
