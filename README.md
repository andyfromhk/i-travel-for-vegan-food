# I Travel For Vegan Food: site scripts

Scripts that add traveller features to itravelforveganfood.com. They are served to the website by
[jsDelivr](https://www.jsdelivr.com), a free service that delivers files from public GitHub repositories.

| File | Loaded on | What it does |
|---|---|---|
| `core.js` | Every page | Saved places, vegan phrase card, price converter, closed badges, image captions, back button, and the shared toolbox (`window.VT`) the other scripts use |
| `guide.js` | Articles and Map Guides templates | Coming next |
| `destination.js` | Destinations template | Coming after that |

Test checklists live in `docs/`.

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
