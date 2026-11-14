// The free cheat-sheet email a reader gets when they sign up on a Japan, Thailand, Taiwan or Hong Kong page:
// must-visit restaurants by city, the guides to read, the book, the phrase card's phrases, and a link back.
// It shares its look with the "Email me my list" email (email.js). The content is in cheat-sheet-data.js.

import { CHEAT_SHEETS } from './cheat-sheet-data.js';
import { BOOKS } from './data.js';
import { COLOURS, FONT, escapeHtml, a, NAME, ROW, heading, shell } from './email.js';

// Added to links back to the site so you can tell which visits and sales came from this email.
const TRACKING = 'utm_source=cheat-sheet-email&utm_medium=email&utm_campaign=cheat-sheet';
const track = (url) => url + (url.includes('?') ? '&' : '?') + TRACKING;

/** The countries that have a cheat sheet, e.g. ["japan", "thailand", "taiwan", "hong-kong"]. */
export const cheatSheetCountries = () => Object.keys(CHEAT_SHEETS);

const cityNames = (sheet) => sheet.cities.map((c) => c.name);
const guidesPhrase = (sheet) => (sheet.guides.length === 1 ? 'the guide to read' : 'the guides to read');
const listNames = (names) => (names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names.at(-1) : names[0] || '');

export function cheatSheetSubject(country) {
  return 'Your vegan ' + CHEAT_SHEETS[country].name + ' cheat sheet';
}

// Green text links, like "Restaurant page →".
const LINK = 'color:' + COLOURS.green + ';font-weight:500;font-size:14px;text-decoration:none;white-space:nowrap;';

// Two lines: the name with "Restaurant page →" on the right (a table, as email apps don't all do flexbox),
// then the description.
function placeRow(place, siteUrl) {
  const page = place.page ? track(siteUrl + place.page) : null;
  return '<tr><td style="' + ROW + '">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
    + '<td valign="middle" style="font-family:' + FONT + ';"><span style="' + NAME + '">' + escapeHtml(place.name) + '</span></td>'
    + (page ? '<td valign="middle" align="right" style="padding-left:12px;font-family:' + FONT + ';">' + a(page, 'Restaurant page →', LINK) + '</td>' : '')
    + '</tr></table>'
    + (place.text ? '<div style="margin-top:4px;font-size:14px;line-height:1.5;color:' + COLOURS.muted + ';">' + escapeHtml(place.text) + '</div>' : '')
    + '</td></tr>';
}

function guideRow(guide, siteUrl) {
  return '<tr><td style="' + ROW + '">' + a(track(siteUrl + guide.page), guide.name + ' →', NAME) + '</td></tr>';
}

function bookBlock(sheet, siteUrl) {
  const book = BOOKS[sheet.book];
  if (!book) return '';
  const link = track(siteUrl + '/shop');
  const cover = book.cover
    ? '<td width="92" valign="top" style="padding:16px 0 16px 16px;">'
      + '<a href="' + escapeHtml(link) + '"><img src="' + escapeHtml(book.cover) + '" width="76" alt="Cover of ' + escapeHtml(book.title) + '" style="display:block;width:76px;height:auto;border:0;border-radius:4px;"></a></td>'
    : '';
  return '<tr><td style="padding:26px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + COLOURS.sun + ';border-radius:10px;"><tr>'
    + cover
    + '<td valign="top" style="padding:16px 18px 16px ' + (book.cover ? '14px' : '18px') + ';font-family:' + FONT + ';color:' + COLOURS.sunInk + ';">'
    + '<div style="font-size:20px;line-height:1.3;font-weight:700;color:' + COLOURS.green + ';">Want the full guide?</div>'
    + '<div style="margin:4px 0 12px;font-size:14px;line-height:1.5;"><strong>' + escapeHtml(book.title) + '</strong>: ' + escapeHtml(book.text) + '</div>'
    + a(link, 'See the book', 'display:inline-block;padding:9px 16px;border:1.5px solid ' + COLOURS.sunInk + ';border-radius:20px;color:' + COLOURS.sunInk + ';font-weight:700;font-size:14px;text-decoration:none;')
    + '</td></tr></table></td></tr>';
}

function phraseRows(phrases) {
  return phrases.lines.map((line) => '<tr><td style="' + ROW + '">'
    + '<div lang="' + escapeHtml(phrases.code) + '" style="font-size:18px;line-height:1.5;font-weight:700;color:' + COLOURS.ink + ';">'
    + escapeHtml(line.text).replace(/\n/g, '<br>') + '</div>'
    + '<div style="margin-top:4px;font-size:14px;line-height:1.5;color:' + COLOURS.muted + ';">' + escapeHtml(line.en) + '</div>'
    + '</td></tr>').join('')
    + (phrases.note ? '<tr><td style="padding:12px 0 0;font-family:' + FONT + ';font-size:13px;line-height:1.5;color:' + COLOURS.faint + ';">' + escapeHtml(phrases.note) + '</td></tr>' : '');
}

const FOOTER_NOTE = "You asked for this cheat sheet on itravelforveganfood.com, and you're now on my newsletter for new vegan foodie guides. Every newsletter email has an unsubscribe link.";

export function renderCheatSheetHtml(country, { siteUrl, logoUrl }) {
  const sheet = CHEAT_SHEETS[country];
  const cities = cityNames(sheet);
  let rows = '';
  sheet.cities.forEach((city) => {
    rows += heading(city.name, 'Must-visit restaurants');
    city.places.forEach((place) => { rows += placeRow(place, siteUrl); });
  });
  if (sheet.guides.length) {
    rows += heading(sheet.guides.length > 1 ? 'Recommended guides' : 'Recommended guide');
    sheet.guides.forEach((guide) => { rows += guideRow(guide, siteUrl); });
  }
  rows += bookBlock(sheet, siteUrl);
  rows += heading('Phrases to know', sheet.phrases.language);
  rows += phraseRows(sheet.phrases);
  rows += '<tr><td style="padding:28px 0 4px;font-family:' + FONT + ';text-align:center;">'
    + '<div style="margin-bottom:12px;font-size:15px;color:' + COLOURS.muted + ';">For more vegan foodie guides</div>'
    + a(track(siteUrl), 'Visit I Travel For Vegan Food', 'display:inline-block;padding:11px 22px;border-radius:24px;background:' + COLOURS.green + ';color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;')
    + '</td></tr>';

  return shell({
    title: cheatSheetSubject(country),
    preheader: 'Must-visit vegan restaurants in ' + listNames(cities) + ', ' + guidesPhrase(sheet) + ' and the phrases to know.',
    siteUrl,
    logoUrl,
    h1: cheatSheetSubject(country),
    intro: '<p style="margin:0;font-size:15px;line-height:1.55;color:' + COLOURS.muted + ';">Here are my must-visit vegan spots in '
      + escapeHtml(listNames(cities)) + ', ' + guidesPhrase(sheet) + ' before you go, and the phrases that make ordering easy. Keep this email handy on your trip.</p>',
    rows,
    footer: '<p style="margin:0 0 8px;">Questions? Just reply to this email.</p><p style="margin:0;">' + escapeHtml(FOOTER_NOTE) + '</p>',
  });
}

export function renderCheatSheetText(country, { siteUrl }) {
  const sheet = CHEAT_SHEETS[country];
  const lines = [cheatSheetSubject(country), 'From I Travel For Vegan Food (itravelforveganfood.com)', ''];
  lines.push('Here are my must-visit vegan spots in ' + listNames(cityNames(sheet)) + ', ' + guidesPhrase(sheet) + ' before you go, and the phrases that make ordering easy.', '');
  sheet.cities.forEach((city) => {
    lines.push(city.name.toUpperCase() + ': MUST-VISIT RESTAURANTS', '');
    city.places.forEach((place) => {
      lines.push(place.name);
      if (place.text) lines.push(place.text);
      if (place.page) lines.push('Restaurant page: ' + track(siteUrl + place.page));
      lines.push('');
    });
  });
  if (sheet.guides.length) {
    lines.push('RECOMMENDED GUIDES', '');
    sheet.guides.forEach((guide) => lines.push(guide.name, track(siteUrl + guide.page), ''));
  }
  const book = BOOKS[sheet.book];
  if (book) lines.push('Want the full guide? ' + book.title + ': ' + book.text, track(siteUrl + '/shop'), '');
  lines.push('PHRASES TO KNOW: ' + sheet.phrases.language.toUpperCase(), '');
  sheet.phrases.lines.forEach((line) => lines.push(line.text.replace(/\n/g, ' '), line.en, ''));
  if (sheet.phrases.note) lines.push(sheet.phrases.note, '');
  lines.push('For more vegan foodie guides: ' + track(siteUrl), '', 'Questions? Just reply to this email.', FOOTER_NOTE);
  return lines.join('\n');
}

export function renderCheatSheet(country, options) {
  return { subject: cheatSheetSubject(country), html: renderCheatSheetHtml(country, options), text: renderCheatSheetText(country, options) };
}
