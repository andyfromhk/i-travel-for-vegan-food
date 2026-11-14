// Builds worker/src/cheat-sheet-data.js: what goes in each country's free cheat-sheet email.
//
// The plan below names the restaurants, guides and book for each country. Names, descriptions and page
// addresses are read from the website's own content (src/content), and the phrases from the phrase card
// (src/scripts/core.js), so the email always matches the site.
//
// Run after changing the plan or the restaurants it names:
//   node worker/scripts/build-cheat-sheets.mjs
// then deploy the email Worker.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---------------------------------------------------------------- the plan

const PLAN = {
  japan: {
    name: "Japan",
    book: "japan",
    phrases: "ja",
    cities: [
      { name: "Tokyo", places: ["izakaya-masaka", "ts-tantan", "marbre-vegan"] },
      { name: "Kyoto", places: ["vegan-ramen-uzu", "mumokuteki-cafe", "veg-out"] },
      { name: "Osaka", places: ["mercy-vegan-factory", "paprika-shokudo", "vegan-ramen-by-playpen-friends"] },
    ],
    guides: [
      "map-guides/3-day-tokyo-itinerary-for-first-timers",
      "articles/vegan-kyoto-guide",
      "articles/vegan-friendly-day-trip-ideas-in-japan-nara-kamakura-kobe-himeji",
    ],
  },
  thailand: {
    name: "Thailand",
    book: "thailand",
    phrases: "th",
    cities: [
      { name: "Bangkok", places: ["vegan-mahanakhon", "veganerie", "vistro"] },
      { name: "Chiang Mai", places: ["the-vegano-bistro", "rad-rabbit", "aum-vegetarian"] },
      { name: "Phuket", places: ["ubuntu-eat", "soul-cafe-restaurant", "yo-vegan"] },
    ],
    guides: [
      "articles/vegan-bangkok-guide",
      "articles/vegan-chiang-mai-guide",
      "articles/vegan-phuket-guide",
      "articles/best-vegan-hotels-resorts-in-thailand",
    ],
  },
  taiwan: {
    name: "Taiwan",
    book: "taiwan",
    phrases: "zh-TW",
    cities: [
      {
        name: "Taipei",
        // These have no restaurant page yet, so they're listed without links.
        places: [
          {
            name: "Foldie",
            text: "Creative takes on Asian favourites like tomato wonton and truffle stinky tofu, beautifully presented. Dishes with egg or milk are marked on the menu.",
          },
          {
            name: "Baganhood",
            text: "A classy vegan restaurant near Taipei 101 with Western dishes and standouts like Sichuan peppercorn 'fried chicken' made from enoki mushrooms.",
          },
          {
            name: "Mukuchi Kitchen & Bar 無口小廚",
            text: "Hearty all-vegan ramen bowls in a charming alleyway near historic Dihua Old Street.",
          },
        ],
      },
    ],
    guides: ["articles/vegan-taipei-guide"],
  },
  "hong-kong": {
    name: "Hong Kong",
    book: "hong-kong",
    phrases: "zh-HK",
    cities: [{ name: "Hong Kong", places: ["ln-coffee", "veggie-kingdom", "tin-tin-vegetarian"] }],
    guides: [
      "articles/vegan-hong-kong-guide",
      "articles/vegan-hong-kong-street-food",
      "map-guides/hong-kong-vegan-yum-cha",
    ],
  },
};

// ---------------------------------------------------------------- reading the site

async function frontMatter(file) {
  const source = await readFile(file, "utf8");
  const end = source.indexOf("\n---", 3);
  return YAML.parse(source.slice(3, end));
}


// The phrase card's PHRASES object, read straight out of core.js.
async function phraseCards() {
  const source = await readFile(path.join(ROOT, "src/scripts/core.js"), "utf8");
  const start = source.indexOf("{", source.indexOf("const PHRASES = {"));
  let depth = 0;
  let end = start;
  for (; end < source.length; end++) {
    if (source[end] === "{") depth++;
    else if (source[end] === "}" && --depth === 0) break;
  }
  return new Function(`return ${source.slice(start, end + 1)};`)();
}

async function place(slug) {
  const data = await frontMatter(path.join(ROOT, "src/content/places", `${slug}.md`));
  if (data.page === false || data.redirectTo || data.status === "permanently-closed")
    throw new Error(`${slug} has no live page`);
  return {
    name: data.name,
    text: data.summary || "",
    page: `/restaurants/${slug}`,
  };
}

async function guide(id) {
  const data = await frontMatter(path.join(ROOT, "src/content/guides", `${id}.md`));
  if (data.draft) throw new Error(`${id} is a draft`);
  return { name: data.title, page: `/${id}` };
}

// ---------------------------------------------------------------- writing the data file

const cards = await phraseCards();
const sheets = {};
for (const [country, plan] of Object.entries(PLAN)) {
  const card = cards[plan.phrases];
  sheets[country] = {
    name: plan.name,
    book: plan.book,
    cities: await Promise.all(
      plan.cities.map(async (city) => ({
        name: city.name,
        places: await Promise.all(city.places.map((p) => (typeof p === "string" ? place(p) : p))),
      })),
    ),
    guides: await Promise.all(plan.guides.map(guide)),
    phrases: {
      language: card.label,
      code: card.code,
      lines: card.lines.map((line) => ({ text: line.text, en: line.en })),
      note: card.note,
    },
  };
}

const out = path.join(ROOT, "worker/src/cheat-sheet-data.js");
await writeFile(
  out,
  `// Made by worker/scripts/build-cheat-sheets.mjs from the website's content. Don't edit by hand:
// change the plan in that script and run it again.

export const CHEAT_SHEETS = ${JSON.stringify(sheets, null, 2)};
`,
);
console.log(`Wrote ${path.relative(ROOT, out)}: ${Object.keys(sheets).join(", ")}`);
