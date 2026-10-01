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

// Your books. The email shows a small block for each country in the reader's list that has one.
// Edit the wording or links here. Links go straight to each book's Gumroad page.
export const BOOKS = {
  'japan': {
    title: 'The Vegan Foodie Guide To Japan',
    text: '130+ vegan spots across Tokyo, Kyoto, Osaka and day trips like Nara, Kamakura, Kobe and Himeji, plus a convenience store survival guide. Instant PDF download.',
    url: 'https://itravelforveganfood.gumroad.com/l/the-vegan-foodie-guide-to-japan',
  },
  'hong-kong': {
    title: 'The Vegan Foodie Guide To Hong Kong',
    text: 'Vegan gems across Hong Kong Island, Kowloon and the New Territories, from street food to fine dining, by a vegan local. Instant PDF download.',
    url: 'https://itravelforveganfood.gumroad.com/l/the-vegan-foodie-guide-to-hong-kong',
  },
  'taiwan': {
    title: 'The Vegan Foodie Guide To Taiwan',
    text: 'The best vegan food in Taipei, Taichung and Taoyuan, plus night markets and pay-by-weight buffets. Instant PDF download.',
    url: 'https://itravelforveganfood.gumroad.com/l/the-vegan-foodie-guide-to-taiwan',
  },
  'thailand': {
    title: 'The Vegan Foodie Guide To Thailand',
    text: '110+ vegan-friendly cafes and restaurants across Bangkok, Chiang Mai and Phuket, plus how to spot jay food. Instant PDF download.',
    url: 'https://itravelforveganfood.gumroad.com/l/the-vegan-foodie-guide-to-thailand',
  },
};

// Added to book links so you can tell which sales came from this email.
export const BOOK_LINK_TRACKING = 'utm_source=saved-list-email&utm_medium=email&utm_campaign=saved-list';
