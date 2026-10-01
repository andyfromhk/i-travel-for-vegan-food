// Builds the email: a subject, an HTML version and a plain-text version.
// Email programs only understand old-fashioned HTML (tables and inline styles), so the layout
// is written that way on purpose. Every piece of text is escaped before it goes in.
//
// Order in the email: saved guides, then the book block(s), then places grouped by city.

import { DESTINATIONS, COUNTRY_NAMES, BOOKS, BOOK_LINK_TRACKING } from './data.js';

const COLOURS = { ink: '#1f2a1c', muted: '#5f6b62', faint: '#8a948c', green: '#5a8707', line: '#e3e8df', pill: '#d3d9cf', page: '#f4f6f0', sun: '#fff6cf', sunInk: '#3d3406' };
const FONT = "Montserrat, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const cityName = (slug) => (DESTINATIONS[slug] || [])[0] || null;
const countryOf = (slug) => (DESTINATIONS[slug] || [])[1] || null;

// "Tokyo", "Tokyo and Nara", "Tokyo, Nara and Kyoto", "Tokyo, Nara and 3 more places"
export function joinNames(names) {
  if (names.length <= 1) return names[0] || '';
  if (names.length > 3) return names.slice(0, 2).join(', ') + ' and ' + (names.length - 2) + ' more places';
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

// Where each place's links go, as full addresses.
function placeLinks(item, siteUrl) {
  const city = cityName(item.destination);
  const search = [item.name, item.chain ? city : item.address || city].filter(Boolean).join(', ');
  return {
    maps: item.mapsUrl || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(search),
    mapsLabel: item.chain ? 'Find a location' : 'Google Maps',
    page: item.page ? siteUrl + item.page : null,
    guide: !item.page && item.from ? siteUrl + item.from : null,
  };
}

// Places grouped by city (in the order they were saved), and saved guides.
export function groupItems(items) {
  const groups = new Map();
  items.filter((i) => i.kind === 'place').forEach((item) => {
    const key = cityName(item.destination) || 'Other places';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return { places: [...groups.entries()], guides: items.filter((i) => i.kind === 'guide') };
}

// A book block for each country in the list that has a book (at most two).
export function booksFor(items) {
  const countries = [];
  items.forEach((item) => {
    const country = item.kind === 'place' ? countryOf(item.destination) : null;
    if (country && BOOKS[country] && !countries.includes(country)) countries.push(country);
  });
  return countries.slice(0, 2).map((country) => ({ country, name: COUNTRY_NAMES[country], ...BOOKS[country] }));
}

export function subjectFor(items) {
  const { places } = groupItems(items);
  if (!places.length) return 'Your saved vegan guides';
  const cities = places.map(([city]) => city).filter((c) => c !== 'Other places');
  return cities.length ? 'Your saved vegan spots in ' + joinNames(cities) : 'Your saved vegan spots';
}

// Book links can be full addresses (Gumroad) or pages on your site.
const bookUrl = (siteUrl, url) => (/^https?:\/\//.test(url) ? url : siteUrl + url) + (url.includes('?') ? '&' : '?') + BOOK_LINK_TRACKING;

function footerNote(optedIn) {
  return optedIn
    ? 'You asked for this list on itravelforveganfood.com, and to hear about new guides for these places. Those come from our newsletter, and every newsletter email has an unsubscribe link.'
    : "You asked for this list on itravelforveganfood.com. It's a one-off email: you haven't been added to any mailing list.";
}

// ---------------------------------------------------------------- HTML version

const a = (href, text, style) => '<a href="' + escapeHtml(href) + '" style="' + style + '">' + escapeHtml(text) + '</a>';

// Place and guide names.
const NAME = 'color:' + COLOURS.ink + ';text-decoration:none;font-weight:700;font-size:19px;line-height:1.35;';
// Small pill-shaped link buttons, like the chips in the Saved drawer: grey text, thin outline.
const PILL = 'display:inline-block;margin:8px 6px 0 0;padding:5px 12px;border:1px solid ' + COLOURS.pill + ';border-radius:999px;'
  + 'color:' + COLOURS.muted + ';font-size:13px;font-weight:500;line-height:1.3;text-decoration:none;white-space:nowrap;';
const pills = (links) => '<div>' + links.join(' ') + '</div>';

function placeRow(item, siteUrl) {
  const l = placeLinks(item, siteUrl);
  const title = l.page || l.guide ? a(l.page || l.guide, item.name, NAME) : '<span style="' + NAME + '">' + escapeHtml(item.name) + '</span>';
  const badge = item.status
    ? ' <span style="display:inline-block;margin-left:6px;padding:1px 8px;border-radius:10px;background:#fcebeb;color:#7a1616;font-size:11px;font-weight:700;vertical-align:middle;">' + escapeHtml(item.status) + '</span>'
    : '';
  const meta = [item.area, item.chain ? 'Multiple locations' : null].filter(Boolean).join(' · ');
  const links = [a(l.maps, l.mapsLabel, PILL)];
  if (l.page) links.push(a(l.page, 'Restaurant page', PILL));
  if (l.guide) links.push(a(l.guide, 'In the guide', PILL));
  return '<tr><td style="padding:14px 0;border-bottom:1px solid ' + COLOURS.line + ';font-family:' + FONT + ';">'
    + title + badge
    + (meta ? '<div style="margin-top:2px;font-size:13px;color:' + COLOURS.faint + ';">' + escapeHtml(meta) + '</div>' : '')
    + pills(links)
    + '</td></tr>';
}

function guideRow(guide, siteUrl) {
  return '<tr><td style="padding:14px 0;border-bottom:1px solid ' + COLOURS.line + ';font-family:' + FONT + ';">'
    + a(siteUrl + guide.page, guide.name, NAME)
    + pills([a(siteUrl + guide.page, 'Read the guide', PILL)])
    + '</td></tr>';
}

function groupHeading(text) {
  return '<tr><td style="padding:24px 0 6px;font-family:' + FONT + ';font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:' + COLOURS.green + ';border-bottom:2px solid ' + COLOURS.green + ';">' + escapeHtml(text) + '</td></tr>';
}

function bookBlock(book, siteUrl) {
  return '<tr><td style="padding:24px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + COLOURS.sun + ';border-radius:10px;">'
    + '<tr><td style="padding:18px 20px;font-family:' + FONT + ';color:' + COLOURS.sunInk + ';">'
    + '<div style="font-size:16px;font-weight:700;">Heading to ' + escapeHtml(book.name) + '?</div>'
    + '<div style="margin:4px 0 12px;font-size:14px;line-height:1.5;"><strong>' + escapeHtml(book.title) + '</strong>: ' + escapeHtml(book.text) + '</div>'
    + a(bookUrl(siteUrl, book.url), 'See the book', 'display:inline-block;padding:9px 16px;border:1.5px solid ' + COLOURS.sunInk + ';border-radius:20px;color:' + COLOURS.sunInk + ';font-weight:700;font-size:14px;text-decoration:none;')
    + '</td></tr></table></td></tr>';
}

export function renderHtml(items, { siteUrl, logoUrl, optedIn, truncated }) {
  const { places, guides } = groupItems(items);
  const placeCount = places.reduce((n, [, list]) => n + list.length, 0);
  const cities = places.map(([c]) => c).filter((c) => c !== 'Other places');
  // The short line email apps show next to the subject.
  const preheader = placeCount
    ? placeCount + (placeCount === 1 ? ' saved place' : ' saved places') + (cities.length ? ' in ' + joinNames(cities) : '') + ', with Google Maps links.'
    : 'Your saved guides from I Travel For Vegan Food.';

  let rows = '';
  if (guides.length) {
    rows += groupHeading('Saved guides');
    guides.forEach((g) => { rows += guideRow(g, siteUrl); });
  }
  booksFor(items).forEach((book) => { rows += bookBlock(book, siteUrl); });
  places.forEach(([city, list]) => {
    rows += groupHeading(city + '  ·  ' + list.length + (list.length === 1 ? ' place' : ' places'));
    list.forEach((item) => { rows += placeRow(item, siteUrl); });
  });

  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="color-scheme" content="light only"><title>' + escapeHtml(subjectFor(items)) + '</title></head>'
    + '<body style="margin:0;padding:0;background:' + COLOURS.page + ';">'
    + '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + escapeHtml(preheader) + '</div>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + COLOURS.page + ';"><tr><td align="center" style="padding:24px 12px;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;">'
    + '<tr><td style="padding:28px 28px 8px;font-family:' + FONT + ';">'
    + '<a href="' + escapeHtml(siteUrl) + '" style="text-decoration:none;color:' + COLOURS.green + ';font-weight:700;font-size:14px;">'
    + '<img src="' + escapeHtml(logoUrl) + '" width="36" height="36" alt="I Travel For Vegan Food" style="vertical-align:middle;border:0;margin-right:8px;">I Travel For Vegan Food</a>'
    + '<h1 style="margin:22px 0 6px;font-family:' + FONT + ';font-size:24px;line-height:1.3;color:' + COLOURS.ink + ';">Your saved vegan spots</h1>'
    + '<p style="margin:0;font-size:15px;line-height:1.55;color:' + COLOURS.muted + ';">Here\'s the list you saved on I Travel For Vegan Food. Keep this email handy on your trip: tap <strong>Google Maps</strong> for directions to any place.</p>'
    + (truncated ? '<p style="margin:8px 0 0;font-size:13px;color:' + COLOURS.faint + ';">Your list was long, so this email has the first 60 items.</p>' : '')
    + '</td></tr>'
    + '<tr><td style="padding:0 28px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + rows + '</table></td></tr>'
    + '<tr><td style="padding:24px 28px 28px;font-family:' + FONT + ';font-size:13px;line-height:1.55;color:' + COLOURS.faint + ';">'
    + '<p style="margin:0 0 8px;">Questions, or found a place that has closed? Just reply to this email.</p>'
    + '<p style="margin:0;">' + escapeHtml(footerNote(optedIn)) + '</p>'
    + '</td></tr></table>'
    + '</td></tr></table></body></html>';
}

// ---------------------------------------------------------------- plain-text version

export function renderText(items, { siteUrl, optedIn, truncated }) {
  const { places, guides } = groupItems(items);
  const lines = ['Your saved vegan spots', 'From I Travel For Vegan Food (itravelforveganfood.com)', ''];
  if (truncated) lines.push('Your list was long, so this email has the first 60 items.', '');
  if (guides.length) {
    lines.push('SAVED GUIDES', '');
    guides.forEach((g) => lines.push(g.name, siteUrl + g.page, ''));
  }
  booksFor(items).forEach((book) => {
    lines.push('Heading to ' + book.name + '? ' + book.title + ': ' + book.text, bookUrl(siteUrl, book.url), '');
  });
  places.forEach(([city, list]) => {
    lines.push(city.toUpperCase(), '');
    list.forEach((item) => {
      const l = placeLinks(item, siteUrl);
      lines.push(item.name + (item.status ? ' (' + item.status + ')' : ''));
      if (item.area || item.chain) lines.push([item.area, item.chain ? 'Multiple locations' : null].filter(Boolean).join(' · '));
      lines.push(l.mapsLabel + ': ' + l.maps);
      if (l.page) lines.push('Restaurant page: ' + l.page);
      if (l.guide) lines.push('In the guide: ' + l.guide);
      lines.push('');
    });
  });
  lines.push('Questions, or found a place that has closed? Just reply to this email.', footerNote(optedIn));
  return lines.join('\n');
}

export function renderEmail(items, options) {
  return { subject: subjectFor(items), html: renderHtml(items, options), text: renderText(items, options) };
}
