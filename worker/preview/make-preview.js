// Writes preview/sample-email.html so you can see the email design in a browser.
// Run inside the worker folder: node preview/make-preview.js
import { writeFileSync } from 'node:fs';
import { renderEmail } from '../src/email.js';

const items = [
  { kind: 'place', name: 'Vegan Bistro Jangara', destination: 'tokyo', area: 'Harajuku', mapsUrl: 'https://maps.app.goo.gl/example', page: '/restaurants/vegan-bistro-jangara' },
  { kind: 'guide', name: 'Best Vegan Cafes & Restaurants in Tokyo', destination: 'tokyo', page: '/articles/best-vegan-cafes-restaurants-tokyo' },
  { kind: 'place', name: 'Te Cor Gentil', destination: 'tokyo', area: 'Roppongi', mapsUrl: 'https://maps.app.goo.gl/example', from: '/map-guides/tokyo-vegan-friendly-bakeries#te-cor-gentil' },
  { kind: 'place', name: 'Universal Bakes', destination: 'tokyo', chain: true, locator: 'https://example.com/stores', page: '/restaurants/universal-bakes' },
  { kind: 'guide', name: 'Try These Vegan Breakfast Spots in Osaka', destination: 'osaka', page: '/map-guides/osaka-vegan-breakfast' },
  { kind: 'guide', name: 'Vegan Bangkok Guide', destination: 'bangkok', page: '/articles/vegan-bangkok-guide' },
  { kind: 'place', name: 'Neon Ramen', destination: 'brisbane', area: 'Everton Park', mapsUrl: 'https://maps.app.goo.gl/example', page: '/restaurants/neon-ramen' },
  { kind: 'place', name: 'The Vegan Mary', destination: 'brisbane', area: 'West End', mapsUrl: 'https://maps.app.goo.gl/example', page: '/restaurants/the-vegan-mary', status: 'Permanently Closed' },
];
const email = renderEmail(items, {
  siteUrl: 'https://www.itravelforveganfood.com',
  logoUrl: 'https://cdn.prod.website-files.com/60cbefb367e06dd6b12c5204/683d12c3ba958d15096befc9_i-travel-for-vegan-food-square-logo.webp',
  optedIn: false,
});
writeFileSync(new URL('./sample-email.html', import.meta.url), email.html);
writeFileSync(new URL('./sample-email.txt', import.meta.url), 'Subject: ' + email.subject + '\n\n' + email.text);
console.log('Subject:', email.subject);
