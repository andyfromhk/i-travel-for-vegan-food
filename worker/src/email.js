// Builds the email: a subject, an HTML version and a plain-text version.
// Email programs only understand old-fashioned HTML (tables and inline styles), so the layout
// is written that way on purpose. Every piece of text is escaped before it goes in.
//
// The email is arranged by place, in the order the reader saved things:
//   Japan book -> Tokyo (guides, then places) -> Osaka (guides, then places)
//   -> Thailand book -> Bangkok (guides, then places) -> ...
// Guides and places without a known city come last.

import { DESTINATIONS, COUNTRY_NAMES, BOOKS, BOOK_LINK_TRACKING } from './data.js';

const COLOURS = { ink: '#1f2a1c', muted: '#5f6b62', faint: '#8a948c', green: '#5a8707', line: '#e3e8df', pill: '#d3d9cf', sun: '#fff6cf', sunInk: '#3d3406' };
const FONT = "Montserrat, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const cityName = (slug) => (DESTINATIONS[slug] || [])[0] || null;
const countryOf = (slug) => (DESTINATIONS[slug] || [])[1] || null;
const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

// "Tokyo", "Tokyo and Nara", "Tokyo, Nara and Kyoto", "Tokyo, Nara and 3 more places"
export function joinNames(names) {
  if (names.length <= 1) return names[0] || '';
  if (names.length > 3) return names.slice(0, 2).join(', ') + ' and ' + (names.length - 2) + ' more places';
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

// Countries -> cities -> { guides, places }, in the order things were saved.
export function arrangeByPlace(items) {
  const countries = new Map();
  const other = { guides: [], places: [] };
  items.forEach((item) => {
    const city = cityName(item.destination);
    const bucket = item.kind === 'guide' ? 'guides' : 'places';
    if (!city) { other[bucket].push(item); return; }
    const country = countryOf(item.destination);
    if (!countries.has(country)) countries.set(country, new Map());
    const cities = countries.get(country);
    if (!cities.has(city)) cities.set(city, { city, guides: [], places: [] });
    cities.get(city)[bucket].push(item);
  });
  return {
    countries: [...countries.entries()].map(([country, cities]) => ({
      country,
      name: COUNTRY_NAMES[country] || country,
      book: BOOKS[country] || null,
      cities: [...cities.values()],
    })),
    other,
  };
}

// City names in the list (for the subject and for Kit tags).
export function citiesIn(items, kind) {
  const names = [];
  items.forEach((item) => {
    const city = cityName(item.destination);
    if (city && (!kind || item.kind === kind) && !names.includes(city)) names.push(city);
  });
  return names;
}

export function subjectFor(items) {
  const placeCities = citiesIn(items, 'place');
  if (placeCities.length) return 'Your saved vegan spots in ' + joinNames(placeCities);
  if (items.some((i) => i.kind === 'place')) return 'Your saved vegan spots';
  const guideCities = citiesIn(items, 'guide');
  return guideCities.length ? 'Your saved vegan guides for ' + joinNames(guideCities) : 'Your saved vegan guides';
}

// Where each place's links go, as full addresses.
function placeLinks(item, siteUrl) {
  const city = cityName(item.destination);
  const search = 'https://www.google.com/maps/search/?api=1&query='
    + encodeURIComponent([item.name, item.chain ? city : item.address || city].filter(Boolean).join(', '));
  return {
    // The Google Map Share Link from your CMS, or a chain's store locator, when there is one.
    maps: item.chain ? item.locator || search : item.mapsUrl || search,
    mapsLabel: item.chain ? 'Find a location' : 'Google Maps',
    page: item.page ? siteUrl + item.page : null,
    guide: !item.page && item.from ? siteUrl + item.from : null,
  };
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
const ROW = 'padding:14px 0;border-bottom:1px solid ' + COLOURS.line + ';font-family:' + FONT + ';';

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
  return '<tr><td style="' + ROW + '">'
    + title + badge
    + (meta ? '<div style="margin-top:2px;font-size:13px;color:' + COLOURS.faint + ';">' + escapeHtml(meta) + '</div>' : '')
    + pills(links)
    + '</td></tr>';
}

function guideRow(guide, siteUrl) {
  return '<tr><td style="' + ROW + '">'
    + '<div style="margin-bottom:2px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:' + COLOURS.faint + ';">Guide</div>'
    + a(siteUrl + guide.page, guide.name, NAME)
    + pills([a(siteUrl + guide.page, 'Read the guide', PILL)])
    + '</td></tr>';
}

function heading(text, detail) {
  return '<tr><td style="padding:26px 0 6px;font-family:' + FONT + ';border-bottom:2px solid ' + COLOURS.green + ';">'
    + '<span style="font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:' + COLOURS.green + ';">' + escapeHtml(text) + '</span>'
    + (detail ? '<span style="font-size:13px;color:' + COLOURS.faint + ';">&nbsp;&nbsp;' + escapeHtml(detail) + '</span>' : '')
    + '</td></tr>';
}

function cityDetail(group) {
  return [group.guides.length ? plural(group.guides.length, 'guide') : null, group.places.length ? plural(group.places.length, 'place') : null]
    .filter(Boolean).join(' · ');
}

function bookBlock(country, siteUrl) {
  const book = country.book;
  const link = bookUrl(siteUrl, book.url);
  const cover = book.cover
    ? '<td width="92" valign="top" style="padding:16px 0 16px 16px;">'
      + '<a href="' + escapeHtml(link) + '"><img src="' + escapeHtml(book.cover) + '" width="76" alt="Cover of ' + escapeHtml(book.title) + '" style="display:block;width:76px;height:auto;border:0;border-radius:4px;"></a></td>'
    : '';
  return '<tr><td style="padding:26px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + COLOURS.sun + ';border-radius:10px;"><tr>'
    + cover
    + '<td valign="top" style="padding:16px 18px 16px ' + (book.cover ? '14px' : '18px') + ';font-family:' + FONT + ';color:' + COLOURS.sunInk + ';">'
    + '<div style="font-size:16px;font-weight:700;">Heading to ' + escapeHtml(country.name) + '?</div>'
    + '<div style="margin:4px 0 12px;font-size:14px;line-height:1.5;"><strong>' + escapeHtml(book.title) + '</strong>: ' + escapeHtml(book.text) + '</div>'
    + a(link, 'See the book', 'display:inline-block;padding:9px 16px;border:1.5px solid ' + COLOURS.sunInk + ';border-radius:20px;color:' + COLOURS.sunInk + ';font-weight:700;font-size:14px;text-decoration:none;')
    + '</td></tr></table></td></tr>';
}

export function renderHtml(items, { siteUrl, logoUrl, optedIn, truncated }) {
  const { countries, other } = arrangeByPlace(items);
  const placeCount = items.filter((i) => i.kind === 'place').length;
  const placeCities = citiesIn(items, 'place');
  // The short line email apps show next to the subject.
  const preheader = placeCount
    ? plural(placeCount, 'saved place') + (placeCities.length ? ' in ' + joinNames(placeCities) : '') + ', with Google Maps links.'
    : 'Your saved guides from I Travel For Vegan Food.';

  let rows = '';
  countries.forEach((country) => {
    if (country.book) rows += bookBlock(country, siteUrl);
    country.cities.forEach((group) => {
      rows += heading(group.city, cityDetail(group));
      group.guides.forEach((g) => { rows += guideRow(g, siteUrl); });
      group.places.forEach((p) => { rows += placeRow(p, siteUrl); });
    });
  });
  if (other.guides.length) {
    rows += heading('More guides');
    other.guides.forEach((g) => { rows += guideRow(g, siteUrl); });
  }
  if (other.places.length) {
    rows += heading('Other places');
    other.places.forEach((p) => { rows += placeRow(p, siteUrl); });
  }

  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="color-scheme" content="light only"><title>' + escapeHtml(subjectFor(items)) + '</title></head>'
    + '<body style="margin:0;padding:0;background:#ffffff;">'
    + '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + escapeHtml(preheader) + '</div>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:0;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;">'
    + '<tr><td style="padding:24px 16px 4px;font-family:' + FONT + ';">'
    + '<a href="' + escapeHtml(siteUrl) + '" style="text-decoration:none;color:' + COLOURS.green + ';font-weight:700;font-size:14px;">'
    + '<img src="' + escapeHtml(logoUrl) + '" width="36" height="36" alt="I Travel For Vegan Food" style="vertical-align:middle;border:0;margin-right:8px;">I Travel For Vegan Food</a>'
    + '<h1 style="margin:22px 0 6px;font-family:' + FONT + ';font-size:24px;line-height:1.3;color:' + COLOURS.ink + ';">Your saved vegan spots</h1>'
    + '<p style="margin:0;font-size:15px;line-height:1.55;color:' + COLOURS.muted + ';">Here\'s the list you saved on I Travel For Vegan Food. Keep this email handy on your trip: tap <strong>Google Maps</strong> for directions to any place.</p>'
    + (truncated ? '<p style="margin:8px 0 0;font-size:13px;color:' + COLOURS.faint + ';">Your list was long, so this email has the first 60 items.</p>' : '')
    + '</td></tr>'
    + '<tr><td style="padding:0 16px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + rows + '</table></td></tr>'
    + '<tr><td style="padding:24px 16px 28px;font-family:' + FONT + ';font-size:13px;line-height:1.55;color:' + COLOURS.faint + ';">'
    + '<p style="margin:0 0 8px;">Questions, or found a place that has closed? Just reply to this email.</p>'
    + '<p style="margin:0;">' + escapeHtml(footerNote(optedIn)) + '</p>'
    + '</td></tr></table>'
    + '</td></tr></table></body></html>';
}

// ---------------------------------------------------------------- plain-text version

function textPlace(item, siteUrl, lines) {
  const l = placeLinks(item, siteUrl);
  lines.push(item.name + (item.status ? ' (' + item.status + ')' : ''));
  if (item.area || item.chain) lines.push([item.area, item.chain ? 'Multiple locations' : null].filter(Boolean).join(' · '));
  lines.push(l.mapsLabel + ': ' + l.maps);
  if (l.page) lines.push('Restaurant page: ' + l.page);
  if (l.guide) lines.push('In the guide: ' + l.guide);
  lines.push('');
}

function textGuide(guide, siteUrl, lines) {
  lines.push('Guide: ' + guide.name, siteUrl + guide.page, '');
}

export function renderText(items, { siteUrl, optedIn, truncated }) {
  const { countries, other } = arrangeByPlace(items);
  const lines = ['Your saved vegan spots', 'From I Travel For Vegan Food (itravelforveganfood.com)', ''];
  if (truncated) lines.push('Your list was long, so this email has the first 60 items.', '');
  countries.forEach((country) => {
    if (country.book) {
      lines.push('Heading to ' + country.name + '? ' + country.book.title + ': ' + country.book.text, bookUrl(siteUrl, country.book.url), '');
    }
    country.cities.forEach((group) => {
      lines.push(group.city.toUpperCase() + ' (' + cityDetail(group) + ')', '');
      group.guides.forEach((g) => textGuide(g, siteUrl, lines));
      group.places.forEach((p) => textPlace(p, siteUrl, lines));
    });
  });
  if (other.guides.length) {
    lines.push('MORE GUIDES', '');
    other.guides.forEach((g) => textGuide(g, siteUrl, lines));
  }
  if (other.places.length) {
    lines.push('OTHER PLACES', '');
    other.places.forEach((p) => textPlace(p, siteUrl, lines));
  }
  lines.push('Questions, or found a place that has closed? Just reply to this email.', footerNote(optedIn));
  return lines.join('\n');
}

export function renderEmail(items, options) {
  return { subject: subjectFor(items), html: renderHtml(items, options), text: renderText(items, options) };
}
