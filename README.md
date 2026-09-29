# I Travel For Vegan Food: site scripts

Scripts that add traveller features to itravelforveganfood.com. They are served to the website by
[jsDelivr](https://www.jsdelivr.com), a free service that delivers files from public GitHub repositories.

| File | Loaded on | What it does |
|---|---|---|
| `core.js` | Every page | Saved places, vegan phrase card, price converter, closed badges, image captions, back button, and the shared toolbox (`window.VT`) the other scripts use |
| `guide.js` | Articles and Map Guides templates | Tip boxes and dividers (old codes and new shortcuts), table of contents, image pairs, the interactive map guide, Save buttons, "Save this guide", "My location" with Directions, and Google Maps directions for each leg of a route |
| `destination.js` | Destinations template | The fullscreen restaurant map (markers, tooltips that open the restaurant page, locate icon, Finsweet filters), Save hearts on the map list and the page's restaurant grid, your "Saved" tag and your "Distance from Me" sort option |

Test checklists live in `docs/`, along with:

- `writing-guide.md`: the tip box and divider shortcuts
- `email-my-list-setup.md`: the accounts and keys to set up before the "Email me my list" feature is built
- `astro-migration-brief.md`: the brief for Claude Code for moving the site to Astro and Cloudflare Pages

## How the website loads a script

Each script is loaded with a line like this in Webflow's custom code:

```html
<script defer src="https://cdn.jsdelivr.net/gh/andyfromhk/i-travel-for-vegan-food@v1.1.1/core.min.js"></script>
```

- `andyfromhk/i-travel-for-vegan-food` is this repository.
- `@v1.0.0` is a **version tag**. It pins the website to one exact version of the files.
- `core.min.js` asks jsDelivr for a compressed copy of `core.js` with the comments removed. You never need to create
  `.min.js` files yourself; jsDelivr makes them automatically.
- `defer` tells the browser to download the script without pausing the page, then run it once the page is ready.

The repository must be **public** for jsDelivr to serve it. That's fine: the code is visible in the browser anyway.

### Tags are snapshots of the whole repository

A tag like `v1.2.0` captures every file in the repository at that moment. Each script tag in Webflow points at a
tag, and each file has its own version number written at the top of the file.

| Where in Webflow | Script line uses | File version inside |
|---|---|---|
| Site settings > Footer | `@v1.3.0/core.min.js` | core.js 1.2.0 |
| Articles and Map Guides templates | `@v1.5.0/guide.min.js` | guide.js 1.2.1 |
| Destinations template | `@v1.6.1/destination.min.js` | destination.js 1.1.1 |

You only change a script line when that script changes. For example, v1.2.0 contained core.js 1.1.1 unchanged, so
the core line stayed at `@v1.1.1` until core itself changed in v1.3.0.

## Releasing a new version

1. Upload the changed file(s) to this repository (GitHub website: **Add file > Upload files**, then **Commit changes**).
2. Create a tag: **Releases > Draft a new release > Choose a tag**, type the new version (e.g. `v1.0.1`),
   **Create new tag**, then **Publish release**.
3. In Webflow, change the version in the script line (e.g. `@v1.0.0` to `@v1.0.1`) and publish.

Use a new tag number for every change. jsDelivr keeps a copy of each tagged version forever, so a tag always
serves exactly the same file. That is also why you should never point Webflow at `@main`: branch links are cached
for hours and can serve an old or half-finished copy.

Version numbers: change the last number for fixes (`v1.0.1`), the middle number for new features (`v1.1.0`).

## Rolling back

If a new version causes a problem, change the tag in Webflow back to the previous one and publish.
The old version is still available instantly.

## Debugging

Add `?vtdebug=1` to any page address (for example `https://www.itravelforveganfood.com/articles/...?vtdebug=1`),
open the browser's developer tools (F12), and any error from these scripts appears in the **Console** tab.
Without that flag, the scripts stay silent.

## Changelog

### destination.js v1.1.1 (release v1.6.1)
- Saved places show a red heart on their map marker instead of a dot.
- The Saved tag's count is white on #333 when off, green on white when on.
- The active card border is 1.5px (was 2px).

### destination.js v1.1.0 (release v1.6.0)
- Uses your own elements instead of adding buttons: the "Distance from Me" sort option (optional
  `data-vt-sort="distance"`) and the "Saved" tag (`.destination-saved-toggle`, gets a heart, a count and `is-active`).
- "Distance from Me" updates the Sort label, re-sorts from your current position when chosen again, hands back to
  Finsweet when another option is chosen, and restores the label if location isn't available.
- Save hearts on the restaurant grid under "Open map" (beside each card link, over the photo's top-right corner).
- Tapping a map tooltip opens the restaurant page in a new tab (the tooltip's heart still just saves).

### destination.js v1.0.0 and guide.js v1.2.1 (release v1.5.0)
- destination.js replaces the old destination map script and its Google Maps line. Same behaviour: fullscreen
  open/close, veg-coloured markers, tooltips, marker tap highlights and scrolls to the card, locate icon, markers
  follow Finsweet filters with a zoom cap for one or two results.
- Each card is read on its own (fixes the old position-matching risk); the map is built on first open (faster
  pages, fewer paid map loads); a list watcher replaces the 300 ms / 1 s timers; no duplicate Finsweet load.
- New: Save hearts on cards and in tooltips, a pink dot on saved markers, a "Saved" filter, and "Near me" sorting
  with walking times and a blue dot. Optional card attributes `data-vt-maps`, `data-vt-address`, `data-vt-locator`.
- guide.js v1.2.1: "My location" top left on phones; article heading rows take the heading's side margins as well.

### guide.js v1.2.0 (release v1.4.0)
- Articles: "Save this guide" sits under the short description (`.guide-hero-description`), or in
  `data-vt-save-guide-slot` if you add one.
- Articles: each restaurant's Save button shares a flex row with its name (space-between, centred); the row takes
  over the heading's spacing.
- Map guides: the walking companion is removed (and its stored ticks tidied away).
- Map guides: a Directions button next to Save, shown while "My location" is on and the reader is within 50 km.
  It opens Google Maps directions from the reader's position (walking under 3 km, otherwise Google chooses).
- Route guides: "Open in Google Maps" inside each route block, with directions for that leg. The travel mode comes
  from the block's text (walk, subway, or both).

### guide.js v1.1.0 and core.js v1.2.0 (release v1.3.0)
- Save buttons on places in articles and map guides. A place with a restaurant page is the same saved item as on
  its page; places keep the guide's exact Google Maps link and link back to their section.
- "Save this guide" (optional position: `data-vt-save-guide-slot`).
- Walking companion on route guides: mark stops as visited (remembered on the device), progress bar, faded markers,
  "Next stop" (opens the place's Google Maps listing) and a walking route through the rest of the day.
- "My location" on map guides: blue dot and walking times, asked for only on tap; friendly message when far away.
- Chains with multiple locations show "… has multiple locations" on the map.
- core.js: new `VT.location` helper (watch position, distance, walking time, error messages).

### guide.js v1.0.0 (release v1.2.0)
- New writing shortcuts: `---` for dividers, block quotes for tip boxes (emoji picks the icon). Old `[.tips]` codes still work.
- Replaces the Refokus script, the table of contents and image pair scripts, the old map script and the three GSAP libraries.
- Map guide: the intro message now disappears when the first place is reached; tooltips keep the veg-type pill and
  price on one line; the map zooms back in to street level after a route overview.
- Table of contents: same section ids as before (old links keep working), unique ids for repeated headings, and the
  highlight no longer touches other elements with an `active` class.

### core.js v1.1.1
- Heading badges use the same font as the paragraph text (matching the badges next to links).
- Restaurant pages refresh a reader's saved copy of that place, so places saved earlier pick up new details
  such as the Google Map Share Link.
- Webflow: the Restaurants template's `data-vt-maps` attribute is bound to the new **Google Map Share Link** field.

### core.js v1.1.0
- Saved places open their actual Google Maps listing (searched by name and address) instead of a coordinate pin.
  Chains show "Find a location" (store locator). Optional exact links via `data-vt-maps` or `data-vt-place-id`.
- Copy list and Share list include each place's Google Maps (or store locator) link and its restaurant page link.
- Phrase card: six phrases per language (no "Thank you"), and the logo and site name in the top left.
- Closed badges read "Permanently Closed" / "Temporarily Closed" and also appear on the restaurant's section heading.
  Optional `data-vt-name` attribute on the footer's closed list improves heading matching.
- Permanently closed restaurant pages don't show a Save button; saved places that later close are flagged in the list.

### core.js v1.0.0
- First release: saved places, phrase card, price converter, closed badges, image captions, back button, `window.VT` toolbox.
