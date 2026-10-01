# core.js: setup and test checklist

## Upgrading from v1.0.0 to v1.1.0 (you are here)

You've already done Parts A to D for v1.0.0, so upgrading takes four steps:

1. [ ] Upload the new `core.js` to GitHub (replace the old file), then create a release with the tag `v1.1.0`.
2. [ ] In **Site settings > Custom code > Footer code**, change `@v1.0.0` to `@v1.1.0` in the script line.
3. [ ] Optional but recommended: in your footer's closed-restaurant lists, add one more attribute to each
   **Collection Item**: `data-vt-name`, bound to **Name**. It helps the script find the right section heading
   for its badge when a guide's link text differs from the restaurant's name (e.g. "this burger place").
4. [ ] Publish to staging and run the **What's new in v1.1.0** tests below, then publish to your domains.

### What's new in v1.1.0: tests

- [ ] **Google Maps listing.** Save a restaurant, open Saved, tap **Google Maps**: Google Maps opens the
      restaurant's own listing (name, photos, reviews, Directions button), not a dropped pin.
      Try one in Japan too. If any place opens the wrong listing, note it; there is an optional fix in the notes at the end.
- [ ] **Chains** show **Find a location** instead, which opens your store locator link
      (or a Google Maps search for the chain when there's no store locator).
- [ ] **Copy list / Share list** text now has, for each place: its Google Maps (or store locator) link and its
      restaurant page link. Paste it into a note to check.
- [ ] **Phrase card** has six phrase buttons (no "Thank you") in two rows of three, and your avocado logo with
      "I Travel For Vegan Food" in the top left. Check each language in the menu.
- [ ] **Closed badges** read **Permanently Closed** or **Temporarily Closed**.
- [ ] **Heading badges.** In a guide that links to a closed restaurant, the badge also appears next to that
      restaurant's section heading. Headings of other restaurants that only mention it in passing stay unchanged.
      The table of contents and map labels don't include the badge text.
- [ ] **Closed restaurant pages** (Permanently Closed) no longer show a Save button.
- [ ] **Saved list** marks any saved place that has since closed with a badge, and the copied text adds "(Permanently Closed)".

---

## First-time setup (already done for v1.0.0)

Work through the parts in order. Nothing here changes your live site until Part D.

---

## Part A: One-time setup

### A1. Fix the Google Maps key restriction (do this first)

Your key is currently restricted to `https://www.itravelforveganfood.com/`. Without a `*` at the end, Google treats
that as **the homepage only**, so maps on destination and map guide pages may already be refusing to load.

In Google Cloud: **APIs & Services > Credentials >** your key **> Website restrictions**, replace the entry with these three:

```
https://www.itravelforveganfood.com/*
https://itravelforveganfood.com/*
https://itravelforveganfood.webflow.io/*
```

The last one is your staging address, needed for testing. Changes can take a few minutes to apply.

- [ ] Open a destination page (e.g. /destinations/sydney) and a map guide. Both maps load.

### A2. Put the code on GitHub

- [ ] The repository `andyfromhk/i-travel-for-vegan-food` is **public** (Settings > General > Danger Zone > Change visibility).
- [ ] Upload `core.js`, `README.md` and the `docs` folder to the repository.
- [ ] Create the release: **Releases > Draft a new release > Choose a tag**, type `v1.0.0`, **Create new tag**, **Publish release**.
- [ ] Open this address in your browser. You should see compressed code, not an error:
  `https://cdn.jsdelivr.net/gh/andyfromhk/i-travel-for-vegan-food@v1.0.0/core.min.js`

---

## Part B: Webflow setup

### B1. Add the script (Site settings > Custom code > Footer code)

Add this line at the end. **Keep the existing back-button snippet for now**; it is removed in Part D.

```html
<script defer src="https://cdn.jsdelivr.net/gh/andyfromhk/i-travel-for-vegan-food@v1.0.0/core.min.js"></script>
```

### B2. Closed-restaurant list (in your footer component)

This hidden list tells every page which restaurants are closed, so guides can show a "Closed" badge next to links.

1. Inside your footer component, add a **Div Block** and set its display to **None** (it never shows).
2. Inside it, add a **Collection List** of Restaurants, filtered by **Status is Permanently closed**.
3. Select the **Collection Item** and add three custom attributes (Element settings > Custom attributes):

| Name | Value |
|---|---|
| `data-vt-closed` | `1` |
| `data-vt-slug` | bind to **Slug** (click the purple dot) |
| `data-vt-status` | bind to **Status** |
| `data-vt-name` | bind to **Name** (added in v1.1.0, optional) |

4. Duplicate the collection list and change its filter to **Status is Temporarily closed**.

### B3. Restaurants template

Select the section or div that wraps the restaurant's name and header, and add these attributes:

| Name | Value (bind to CMS field) |
|---|---|
| `data-vt-place` | Slug |
| `data-vt-name` | Name |
| `data-vt-destination` | City > Slug |
| `data-vt-lat` | Latitude |
| `data-vt-lng` | Longitude |
| `data-vt-address` | Address |
| `data-vt-locator` | Store Locator |

Then add two small empty Div Blocks:

- **Chain marker:** attribute `data-vt-chain` = `1`, with **conditional visibility: show when Chain is On**.
  (The script checks whether this div is hidden, which works whether or not Webflow lets you bind a switch field directly.)
- **Save button position (optional):** attribute `data-vt-save-slot` = `1`, placed where you want the Save button.
  Without it, the button appears under the restaurant name.

### B4. Map Guides template

Select the element with the class `guide-rich-text` (it already has `data-enable-routing`) and add:

| Name | Value |
|---|---|
| `data-vt-destination` | bind to **Referenced Destination > Slug** |

### B5. Articles template

Find the collection list of the article's referenced cities (the one with the "Open ... Restaurant Map" button).
Select its **Collection Item** and add:

| Name | Value |
|---|---|
| `data-vt-destination` | bind to **Slug** |

If that list is hidden with conditional visibility on some articles, that's fine: hidden items are still in the page.
If an article has no such list, the script falls back to the "Open ... Restaurant Map" link, and without either,
that article simply doesn't get the phrase card or price conversion.

### B6. Destinations template

Nothing to add. The script reads the destination from the page address.

---

## Part C: Test on staging

Publish to **itravelforveganfood.webflow.io only** (untick the custom domains in the publish menu).

Tip: add `?vtdebug=1` to a page address and open the browser console (F12) to see any errors.

### Restaurant pages

- [ ] Open a restaurant page (e.g. Neon Ramen). A **Save** button appears in your slot or under the name.
- [ ] Tap Save: a message says "Saved Neon Ramen", the button turns pink and reads **Saved**, and a dark **Saved (1)** button appears bottom right.
- [ ] Tap **Saved (1)**: the drawer opens with Neon Ramen under **Brisbane**.
- [ ] **Google Maps** opens the restaurant's listing in Google Maps. **Restaurant page** links back. **Remove** removes it.
- [ ] A chain (e.g. Gelato Messina): save it, open the drawer, **Find a location** opens the chain's store locator.
- [ ] Photo captions under restaurant images still show (they come from alt text).
- [ ] On your phone, the drawer slides up from the bottom and the Saved button doesn't cover anything important.

### Guides in Asia

- [ ] Open a Japan article (e.g. the day trips article). A yellow **Vegan phrase card** button appears.
- [ ] Tap it: a full-screen yellow card in Japanese with your logo top left. The six phrase buttons switch phrases, the language menu switches language, **Done** closes it.
- [ ] On your phone, the screen doesn't dim while the card is open.
- [ ] Prices like "2,750 yen" have a small green pill next to them (e.g. "≈ A$28").
- [ ] Tap a pill, choose another currency: all pills update. Reload the page: your choice is remembered.
- [ ] Headings and links containing prices are left unchanged.
- [ ] Repeat on a map guide in Tokyo or Hong Kong. The existing map still works normally.

### Australian pages

- [ ] A Brisbane guide: no phrase card button (English-speaking country).
- [ ] Price pills don't appear for readers whose currency is AUD. (If you want to see them, change your currency on an Asia page first; the choice applies site-wide.)

### Closed badges

- [ ] Temporarily set a restaurant that a published guide links to (e.g. one in the Brisbane CBD guide) to **Temporarily closed**, publish to staging, and check the guide shows a "Temporarily Closed" badge next to the link and next to that restaurant's heading. Then set it back.

### Everything else

- [ ] Back buttons still work.
- [ ] Destination page gallery captions still show.
- [ ] Home page: the Saved button only appears when something is saved.
- [ ] Open the site in two tabs, save something in one: the other tab's Saved count updates.

---

## Part D: Go live and clean up

- [ ] Publish to the custom domains.
- [ ] Remove the old snippets, then publish and re-check the matching items in Part C:
  - **Site settings > Footer:** the jQuery `a.back-button` snippet (the `Webflow.push(...)` block).
  - **Articles template > Footer:** the `$('.images img')` caption snippet (keep the table of contents and image pair scripts; guide.js replaces those later).
  - **Restaurants template > Footer:** the same `$('.images img')` caption snippet.
- [ ] **Restaurants template:** it loads Google Maps with `callback=initializeMap`, but no `initializeMap` function exists on that page. If restaurant pages don't show a map, delete that `<script src="https://maps.googleapis.com/...">` line.

The destination gallery caption code stays for now; it's part of the destination map script, which destination.js replaces later.
Running both at once is harmless.

---

## If something goes wrong

Delete the script line from Site settings (or change the tag back to a previous version) and publish.
Everything returns to how it was before.

---

## Notes

**If a Google Maps link opens the wrong place.** The script searches Google Maps for "Name, Address", which
opens the right listing for nearly every restaurant. For any that don't, you can make it exact: add a Link field
called **Google Maps Link** to Restaurants, paste the place's share link from Google Maps into it, and add the
attribute `data-vt-maps` (bound to that field) to the same wrapper as `data-vt-place` on the Restaurants template.
The script uses that link whenever it's filled in, so you only need it for the few that go wrong.

**Phrase card translations.** v1.1.0 adds new phrases in six languages. They're written to be natural and polite,
but it's still worth asking a native speaker (or a friendly restaurant owner) to glance at each one.
