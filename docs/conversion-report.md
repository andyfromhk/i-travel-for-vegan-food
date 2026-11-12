# Conversion report

Written by `migration/scripts/convert.mjs`. Re-run the script to refresh it.

## Item counts

| Collection | In Webflow | Published | Drafts | Archived (not built) |
| --- | --- | --- | --- | --- |
| Restaurants | 300 | 250 | 45 | 5 |
| Articles | 62 | 58 | 0 | 4 |
| Map Guides | 8 | 8 | 0 | 0 |
| Destinations | 25 | 24 | 0 | 1 |
| Authors | 2 | 2 | 0 | 0 |

- Restaurant pages that already redirect elsewhere in Webflow (kept as data, no page built): **21**
- Places without a review page, created from map guides: **19**
- Images referenced by the content: **4920**

## Map guide places

Each place marker in a map guide was matched to a restaurant record, so its coordinates, veg type and price now come from that record.

| Guide | Heading | Restaurant | Matched by | Distance from old marker | Notes |
| --- | --- | --- | --- | --- | --- |
| byron-bay-1-day-itinerary-for-vegan-foodies | Combi | `combi` | link + name | 0 m |  |
| byron-bay-1-day-itinerary-for-vegan-foodies | Fundies Organics | `fundies-organics` | link + name | 0 m |  |
| byron-bay-1-day-itinerary-for-vegan-foodies | Red Ginger | `red-ginger` | link + name | 0 m |  |
| byron-bay-1-day-itinerary-for-vegan-foodies | Frankies Gelato | `frankies-gelato` | link + name | 0 m |  |
| byron-bay-1-day-itinerary-for-vegan-foodies | No Bones | `no-bones` | link + name | 0 m |  |
| best-vegan-ramen-spots-in-brisbane | Neon Ramen | `neon-ramen` | link + name | 255 m | different spot from the restaurant record, so the guide keeps its own coordinates |
| best-vegan-ramen-spots-in-brisbane | Hai Hai | `hai-hai` | link + name | 2607 m | veg type in guide was "good vegan options"; different spot from the restaurant record, so the guide keeps its own coordinates |
| best-vegan-ramen-spots-in-brisbane | Motto Motto | `motto-motto` | link + name | n/a | chain; veg type in guide was "good vegan options" |
| best-vegan-ramen-spots-in-brisbane | Danbo Labo | `danbo-labo` | link + name | 0 m |  |
| best-vegan-ramen-spots-in-brisbane | Okuman Karaage & Ramen Bar | `okuman-karaage-ramen-bar` | link + name | 155 m | different spot from the restaurant record, so the guide keeps its own coordinates |
| best-vegan-ramen-spots-in-brisbane | Taro's Ramen | `taros-ramen` | name | n/a | chain; veg type in guide was "good vegan options" |
| brisbane-vegan-foodie-walking-tour-itinerary | Vega Cafe | `vega-cafe` | link + name | 0 m |  |
| brisbane-vegan-foodie-walking-tour-itinerary | Noosa Chocolate Factory | `noosa-chocolate-factory` | link + name | 0 m |  |
| brisbane-vegan-foodie-walking-tour-itinerary | Happy Dough or Krispy Kreme | `happy-dough` | link + name | n/a |  |
| brisbane-vegan-foodie-walking-tour-itinerary | Ma Pa Me | `ma-pa-me` | link + name | 0 m |  |
| tokyo-vegan-friendly-bakeries | Universal Bakes | `universal-bakes-and-cafe` | link + name | 0 m |  |
| tokyo-vegan-friendly-bakeries | Te Cor Gentil | `te-cor-gentil` | name | 0 m |  |
| tokyo-vegan-friendly-bakeries | The Little Bakery Tokyo | `the-little-bakery-tokyo` | link + name | 0 m |  |
| tokyo-vegan-friendly-bakeries | OVGO Baker | `ovgo-baker` | name | n/a | chain |
| tokyo-vegan-friendly-bakeries | Alaska Zwei | `alaska-zwei` | name | 3 m | price in guide was "$" |
| hong-kong-vegan-yum-cha | Veggie Kingdom 緻素坊 | `veggie-kingdom` | link + name | 0 m |  |
| osaka-vegan-breakfast | Mercy Vegan Factory | `mercy-vegan-factory` | link + name | 249 m | different spot from the restaurant record, so the guide keeps its own coordinates |
| osaka-vegan-breakfast | Optimus Cafe | `optimus-cafe` | link + name | 1328 m | different spot from the restaurant record, so the guide keeps its own coordinates |
| osaka-vegan-breakfast | Asakara Good Store | `asakara-good-store` | link + name | 867 m | different spot from the restaurant record, so the guide keeps its own coordinates |
| nara-day-trip-itinerary-from-osaka-or-kyoto-vegan | Mochi at Nakatanidou | `nakatanidou` | link + name | 2 m |  |
| nara-day-trip-itinerary-from-osaka-or-kyoto-vegan | Vegan Friendly Ramen by Playpen Friends | `vegan-friendly-ramen-by-playpen-friends` | link + name | 3 m |  |
| nara-day-trip-itinerary-from-osaka-or-kyoto-vegan | Onwa | `onwa` | link + name | 7 m |  |
| 3-day-tokyo-itinerary-for-first-timers | Te Cor Gentil | `te-cor-gentil` | name | 0 m |  |
| 3-day-tokyo-itinerary-for-first-timers | Marbre Vegan | `marbre-vegan` | link + name | 0 m |  |
| 3-day-tokyo-itinerary-for-first-timers | Ain Soph Journey | `ain-soph-journey` | similar name (please confirm) | 8 m |  |
| 3-day-tokyo-itinerary-for-first-timers | Hatoya's Vegan Fruit Sandwiches | `hatoyas-vegan-fruit-sandwiches` | link + name | 2 m |  |
| 3-day-tokyo-itinerary-for-first-timers | Marugoto Vegan Dining Asakusa | `marugoto-vegan-dining-asakusa` | link + name | 3 m |  |
| 3-day-tokyo-itinerary-for-first-timers | Izakaya Masaka | `izakaya-masaka` | link + name | 0 m |  |
| 3-day-tokyo-itinerary-for-first-timers | T's Tantan | `ts-tantan` | link + name | 171 m | different spot from the restaurant record, so the guide keeps its own coordinates |

### Food places with no restaurant page

These became place records with `page: false` (no public page).

- Lulu Ramen — `brisbane-lulu-ramen` (map-guides/best-vegan-ramen-spots-in-brisbane)
- Wa No Kashi Meguri — `tokyo-wa-no-kashi-meguri` (map-guides/tokyo-vegan-friendly-bakeries)
- Oscar Wilde — `tokyo-oscar-wilde` (map-guides/tokyo-vegan-friendly-bakeries)
- VENUTS — `tokyo-venuts` (map-guides/tokyo-vegan-friendly-bakeries)
- Morethan Bakery — `tokyo-morethan-bakery` (map-guides/tokyo-vegan-friendly-bakeries)
- Pain de BRUN — `tokyo-pain-de-brun` (map-guides/tokyo-vegan-friendly-bakeries)
- Maison Landemaine — `tokyo-maison-landemaine` (map-guides/tokyo-vegan-friendly-bakeries)
- Lockcha 樂茶軒 — `hong-kong-lockcha` (map-guides/hong-kong-vegan-yum-cha)
- M Garden 常悅素食 — `hong-kong-m-garden` (map-guides/hong-kong-vegan-yum-cha)
- Vegelink 素之樂素食料理 — `hong-kong-vegelink` (map-guides/hong-kong-vegan-yum-cha)
- Chi Lin Vegetarian 志蓮素齋-龍門樓 — `hong-kong-chi-lin-vegetarian` (map-guides/hong-kong-vegan-yum-cha)
- Three Virtues 三德素食館 — `hong-kong-three-virtues` (map-guides/hong-kong-vegan-yum-cha)
- Light Vegetarian Restaurant 普光齋 — `hong-kong-light-vegetarian-restaurant` (map-guides/hong-kong-vegan-yum-cha)
- FOLK茶菓 (folksaka) — `osaka-folk-folksaka` (map-guides/osaka-vegan-breakfast)
- vegecafe+α — `osaka-vegecafe` (map-guides/osaka-vegan-breakfast)
- maZe nishihorie — `osaka-maze-nishihorie` (map-guides/osaka-vegan-breakfast)
- Starbucks — `osaka-starbucks` (map-guides/osaka-vegan-breakfast)
- Convenience Stores — `osaka-convenience-stores` (map-guides/osaka-vegan-breakfast)
- Vegan Ice Cream in Nara Park — `nara-vegan-ice-cream-in-nara-park` (map-guides/nara-day-trip-itinerary-from-osaka-or-kyoto-vegan)

### Sights and other stops

These keep their coordinates in the guide itself: `{{place: lat, lng | Area}}`.

- Byron Community Market (map-guides/byron-bay-1-day-itinerary-for-vegan-foodies)
- Main Beach & The Pass (map-guides/byron-bay-1-day-itinerary-for-vegan-foodies)
- Cape Byron Lighthouse (map-guides/byron-bay-1-day-itinerary-for-vegan-foodies)
- Byron Bay Town Centre (map-guides/byron-bay-1-day-itinerary-for-vegan-foodies)
- Roma Street Station & Roma Street Parkland (map-guides/brisbane-vegan-foodie-walking-tour-itinerary)
- Brisbane City Exploration (map-guides/brisbane-vegan-foodie-walking-tour-itinerary)
- Queen's Wharf & Skydeck (map-guides/brisbane-vegan-foodie-walking-tour-itinerary)
- South Bank Parklands (map-guides/brisbane-vegan-foodie-walking-tour-itinerary)
- GOMA, Queensland Museum & Art Gallery (map-guides/brisbane-vegan-foodie-walking-tour-itinerary)
- Nara National Museum (map-guides/nara-day-trip-itinerary-from-osaka-or-kyoto-vegan)
- Feeding Deer at Nara Park (map-guides/nara-day-trip-itinerary-from-osaka-or-kyoto-vegan)
- Todai-Ji (map-guides/nara-day-trip-itinerary-from-osaka-or-kyoto-vegan)
- Kasuga Taisha Shrine (map-guides/nara-day-trip-itinerary-from-osaka-or-kyoto-vegan)
- Tokyo Tower (map-guides/3-day-tokyo-itinerary-for-first-timers)
- Shinjuku Gyoen National Garden (map-guides/3-day-tokyo-itinerary-for-first-timers)
- Explore Big Shinjuku Department Stores (map-guides/3-day-tokyo-itinerary-for-first-timers)
- Explore Shinjuku (map-guides/3-day-tokyo-itinerary-for-first-timers)
- Visit Senso-ji in Asakusa (map-guides/3-day-tokyo-itinerary-for-first-timers)
- Explore Akihabara Electric Town (map-guides/3-day-tokyo-itinerary-for-first-timers)
- View from Shibuya Sky Observation Deck (map-guides/3-day-tokyo-itinerary-for-first-timers)
- Experience Shibuya Scramble Crossing (map-guides/3-day-tokyo-itinerary-for-first-timers)
- Tokyo Disneyland or DisneySea (map-guides/3-day-tokyo-itinerary-for-first-timers)
- Admire Tokyo Station Architecture (map-guides/3-day-tokyo-itinerary-for-first-timers)

### Area names that differ between guides

- `te-cor-gentil`: kept "Azabu-Juban", map-guides/3-day-tokyo-itinerary-for-first-timers says "Azabu-juban"

## Warnings

- **articles/vegan-nara-guide**
  - Figure without an image was dropped
