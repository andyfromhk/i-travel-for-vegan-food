// Site data the email needs. When you add a destination on the website, add it here too
// (the same list as in core.js).

// slug: [display name, country slug]
export const DESTINATIONS = {
  'tokyo': ['Tokyo', 'japan'], 'kyoto': ['Kyoto', 'japan'], 'osaka': ['Osaka', 'japan'],
  'nara': ['Nara', 'japan'], 'kobe': ['Kobe', 'japan'], 'himeji': ['Himeji', 'japan'],
  'kamakura': ['Kamakura', 'japan'], 'nagoya': ['Nagoya', 'japan'],
  'fukuoka': ['Fukuoka', 'japan'], 'okinawa': ['Okinawa', 'japan'],
  'bangkok': ['Bangkok', 'thailand'], 'chiang-mai': ['Chiang Mai', 'thailand'], 'phuket': ['Phuket', 'thailand'],
  'seoul': ['Seoul', 'south-korea'],
  'taipei': ['Taipei', 'taiwan'], 'kaohsiung': ['Kaohsiung', 'taiwan'],
  'hong-kong': ['Hong Kong', 'hong-kong'],
  'singapore': ['Singapore', 'singapore'],
  'brisbane': ['Brisbane', 'australia'], 'gold-coast': ['Gold Coast', 'australia'],
  'sunshine-coast': ['Sunshine Coast', 'australia'], 'sydney': ['Sydney', 'australia'],
  'melbourne': ['Melbourne', 'australia'], 'adelaide': ['Adelaide', 'australia'],
};

export const COUNTRY_NAMES = {
  'japan': 'Japan', 'thailand': 'Thailand', 'south-korea': 'South Korea', 'taiwan': 'Taiwan',
  'hong-kong': 'Hong Kong', 'singapore': 'Singapore', 'australia': 'Australia',
};

// Your books. The email shows a block for each country in the reader's list that has one, at the start of
// that country's places. Edit the wording, links or covers here. Links go straight to each book's Gumroad page.
export const BOOKS = {
  'japan': {
    title: 'The Vegan Foodie Guide To Japan',
    text: '130+ vegan spots across Tokyo, Kyoto, Osaka and day trips like Nara, Kamakura, Kobe and Himeji, plus a convenience store survival guide. Instant PDF download.',
    url: 'https://itravelforveganfood.gumroad.com/l/the-vegan-foodie-guide-to-japan',
    cover: 'https://cdn.prod.website-files.com/60cbefb367e06dd6b12c5204/6abe025c01f4f980f4cc0d36_vegan-foodie-guide-cover-japan.webp',
  },
  'hong-kong': {
    title: 'The Vegan Foodie Guide To Hong Kong',
    text: 'Vegan gems across Hong Kong Island, Kowloon and the New Territories, from street food to fine dining, by a vegan local. Instant PDF download.',
    url: 'https://itravelforveganfood.gumroad.com/l/the-vegan-foodie-guide-to-hong-kong',
    cover: 'https://cdn.prod.website-files.com/60cbefb367e06dd6b12c5204/6abe025ce89c0aadcbc7a018_vegan-foodie-guide-cover-hong-kong.webp',
  },
  'taiwan': {
    title: 'The Vegan Foodie Guide To Taiwan',
    text: 'The best vegan food in Taipei, Taichung and Taoyuan, plus night markets and pay-by-weight buffets. Instant PDF download.',
    url: 'https://itravelforveganfood.gumroad.com/l/the-vegan-foodie-guide-to-taiwan',
    cover: 'https://cdn.prod.website-files.com/60cbefb367e06dd6b12c5204/6abe025cb73493c3ac3f68db_vegan-foodie-guide-cover-taiwan.webp',
  },
  'thailand': {
    title: 'The Vegan Foodie Guide To Thailand',
    text: '110+ vegan-friendly cafes and restaurants across Bangkok, Chiang Mai and Phuket, plus how to spot jay food. Instant PDF download.',
    url: 'https://itravelforveganfood.gumroad.com/l/the-vegan-foodie-guide-to-thailand',
    cover: 'https://cdn.prod.website-files.com/60cbefb367e06dd6b12c5204/6abe025c2eb555affcac85b5_vegan-foodie-guide-cover-thailand.webp',
  },
};

// Added to book links so you can tell which sales came from this email.
export const BOOK_LINK_TRACKING = 'utm_source=saved-list-email&utm_medium=email&utm_campaign=saved-list';
