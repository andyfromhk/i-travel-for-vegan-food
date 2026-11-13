# Writing guide: formatting guides on the new site

Guides are written in plain Markdown: the text you type, with a few shortcuts for the special blocks.
Everything below works the same in foodie guides and map guides, and survives being edited in Pages CMS.

The old `[.tips]…[.tips]` and `[.divider][.divider]` codes are gone: every existing guide was converted to
the shortcuts on this page when the site moved from Webflow.

## Dividers

Three hyphens on a line of their own:

```
---
```

## Tip boxes

A block quote becomes a tip box. In Markdown that's a line starting with `>`; in Pages CMS it's the quote button.

```
> 🎫 **Tip**: Get discounted train tickets from Hong Kong International Airport to the city.
```

Start the tip with one of these emoji to choose the icon. With no emoji, you get the light bulb.

| Emoji | Icon | Also accepted |
|---|---|---|
| 💡 | Light bulb (the default) | none needed |
| 📷 | Camera | 📸 |
| 🎫 | Ticket | 🎟️ 🚆 🚄 |
| 🧭 | Compass | |
| 🍜 | Food | 🍱 |
| 🌐 | Website | |
| 📍 | Location | |
| 🏨 | Hotel | 🛏️ |
| 🍴 | Cutlery | 🍽️ |
| 📖 | Book | 📚 |
| 💰 | Money | 💴 💵 |
| 🏷️ | Discount | |
| 📱 | Phone | |

Typing emoji: on a Mac press **Control + Command + Space**; on Windows press **Windows key + .** (full stop).

## Photos

- **A caption** is an italic line directly under the photo:

  ```
  ![Tokyo Tower lit up at night](/media/guides/vegan-tokyo-guide/tokyo-tower-vegan-guide.webp)

  *Tokyo Tower at night*
  ```

- **Two portrait photos in a row sit side by side.** There's nothing to type: put one after the other and the
  site pairs them up. Landscape and square photos always take the full width.
- The text in the square brackets is the alt text, which describes the photo to people using screen readers
  and to search engines.

## Places in a map guide

Each stop in a map guide is a heading followed by a `{{place: …}}` line. The line puts the stop on the map and
adds the small "area | veg type | price" line and the Save button under the heading.

**A restaurant that has a page on the site.** Use the last part of its address. `/restaurants/vega-cafe` is
`vega-cafe`. Its coordinates, area, veg type and price all come from the restaurant's own record, so there's
nothing else to type, and they stay right if you update the restaurant later.

```
## Vega Cafe

{{place: vega-cafe}}
```

If you mistype the name, the site refuses to publish and tells you which names are close, so a typo can't
reach readers.

**The same restaurant, but a different branch.** Add that branch's coordinates and area after the name:

```
{{place: hai-hai | -27.4803792, 153.009339 | West End}}
```

**A sight or stop with no restaurant page.** Give its coordinates and area:

```
## Roma Street Parkland

{{place: -27.4630081, 153.0189415 | Roma Street}}
```

**A food place with no page yet.** Add its veg type and price after the area:

```
{{place: 35.6741, 139.7662 | Ginza | Vegan | $$}}
```

To get coordinates: right-click the spot in Google Maps and click the numbers at the top of the menu to copy them.

## Routes and the end of a day

```
{{route: 15-minute walk | Walk through Roma Street Parkland towards the Spring Hill side of the park.}}

{{end-of-day: That's the end of day 1. Rest up for tomorrow!}}
```

- The part before the `|` is the short label shown on the map ("15-minute walk"). The part after it is the
  text readers see in the guide. Links and bold work there.
- Routes and days only appear on the map when the guide's **Draw routes between stops** switch is on.

## Embedded maps and the hotel widget

```
{{map: https://www.google.com/maps/embed?pb=…}}

{{hotels: Hongdae}}
```

`{{map: …}}` takes the address from Google Maps' **Share → Embed a map**. `{{hotels: …}}` shows the hotel
search widget, opened on the area you name.

## Good to know

- Each shortcut goes on a line of its own, with a blank line above and below.
- Links to other websites open in a new tab automatically. Links within the site are written without the
  domain: `/restaurants/vega-cafe`, not `https://www.itravelforveganfood.com/restaurants/vega-cafe`.
- In foodie guides, Save buttons appear on their own beside a restaurant's heading when its section links to
  the restaurant's page, has a Google Maps link, or starts with a line like `**Vegan** | *Harajuku*`.
- Adding a new tip icon needs three things: the image in `public/site/icons/`, one line in the `TIP_ICONS`
  list in `src/markdown/enhance.ts`, and one line beside the others at the bottom of
  `src/components/typography/RichText.astro`.
