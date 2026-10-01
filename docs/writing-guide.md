# Writing guide: tip boxes and dividers

From guide.js v1.0.0 you can format guides without the `[.tips]…[.tips]` codes. The old codes still work,
so there's no need to change guides you've already written.

## Dividers

Type three hyphens on a line of their own:

```
---
```

That's it. `***` also works.

| Before | Now |
|---|---|
| `[.divider][.divider]` | `---` |

## Tip boxes

1. Write the tip as a normal paragraph, e.g. **Tip**: Get discounted train tickets at the airport.
2. Select it and click the **block quote** button in the rich text toolbar (the “ ” icon).
3. To choose the icon, start the paragraph with one of the emoji below. With no emoji, you get the light bulb.

Example, written in the block quote:

```
🎫 Tip: Get discounted train tickets from Hong Kong International Airport to the city
(Hong Kong Station, Kowloon Station or Tsing Yi Station)
```

The emoji is removed and replaced by the ticket icon, so readers see exactly the same box as before.

| Before | Now |
|---|---|
| `[.tips][.icon-ticket][.icon-ticket][.div]Tip: …[.div][.tips]` | Block quote starting with 🎫 |

Bold, italics and links inside the tip all work. For a line break inside a tip, use Shift + Enter.

### Icons

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
Or copy them from this page.

## Good to know

- Every block quote in a guide becomes a tip box. Instagram embeds contain block quotes too, but they're inside an
  embed, so they're left alone.
- The Webflow Editor still shows your tip as an indented quote and `---` as a plain line. The formatting appears on the
  published site (and on staging).
- Adding a new icon later needs two things: the icon class styled in Webflow (like `icon-idea`) and one line in
  guide.js, in the list called `TIP_ICONS`.
