// Checks and cleans everything the website sends.
//
// Why this matters: this Worker sends email from your domain to any address someone types in.
// If it trusted the browser, a spammer could use it to send their own links under your name.
// So: links may only point to your own site or to Google Maps, names can't contain web
// addresses, and the subject and wording always come from the Worker itself.

import { DESTINATIONS } from './data.js';

export const MAX_ITEMS = 60;

const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const RESTAURANT_PAGE = /^\/restaurants\/[a-z0-9-]{1,120}$/;
const GUIDE_PAGE = /^\/(articles|map-guides)\/[a-z0-9-]{1,160}$/;
const GUIDE_SECTION = /^\/(articles|map-guides)\/[a-z0-9-]{1,160}(#[^\s<>"'`]{1,160})?$/;
const LOOKS_LIKE_WEB_ADDRESS = /(https?:\/\/\S*|www\.\S*|\b[\w-]+(\.[\w-]+)*\.(com|net|org|info|biz|io|co|me|ly|app|xyz|top|site|online|link|click|ru|cn|tk|gg|to|cc|us|uk|au)\b\S*)/gi;
const STATUSES = ['Permanently Closed', 'Temporarily Closed'];

// Plain text only: no tags, no control characters, no web addresses, limited length.
export function cleanText(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(LOOKS_LIKE_WEB_ADDRESS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

// Google Maps links only (share links and google.com/maps pages).
export function cleanMapsUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    const ok = host === 'maps.app.goo.gl'
      || (host === 'goo.gl' && url.pathname.startsWith('/maps'))
      || host === 'maps.google.com'
      || (/^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host) && url.pathname.startsWith('/maps'));
    return ok ? url.toString() : null;
  } catch (e) {
    return null;
  }
}

const matchPath = (value, pattern) => {
  const path = String(value || '').trim();
  return pattern.test(path) ? path : null;
};

function cleanItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.kind === 'guide') {
    const page = matchPath(raw.page, GUIDE_PAGE);
    const name = cleanText(raw.name, 140);
    // The guide's city places it with that city's restaurants in the email.
    const destination = DESTINATIONS[raw.destination] ? raw.destination : null;
    return page && name ? { kind: 'guide', name, page, destination } : null;
  }
  const name = cleanText(raw.name, 100);
  if (!name) return null;
  const destination = DESTINATIONS[raw.destination] ? raw.destination : null;
  return {
    kind: 'place',
    name,
    destination,
    area: cleanText(raw.area, 60) || null,
    address: cleanText(raw.address, 140) || null,
    mapsUrl: raw.chain ? null : cleanMapsUrl(raw.mapsUrl),
    page: matchPath(raw.page, RESTAURANT_PAGE),
    from: matchPath(raw.from, GUIDE_SECTION),
    chain: raw.chain === true,
    status: STATUSES.includes(raw.status) ? raw.status : null,
  };
}

// Returns { ok: true, value } or { ok: false, code }.
export function readRequest(body) {
  if (!body || typeof body !== 'object') return { ok: false, code: 'invalid' };
  const email = cleanEmail(body.email);
  if (!email) return { ok: false, code: 'invalid_email' };
  const token = typeof body.token === 'string' && body.token.length <= 4096 ? body.token : '';
  if (!token) return { ok: false, code: 'bot_check' };
  if (!Array.isArray(body.items) || !body.items.length) return { ok: false, code: 'empty' };
  const items = body.items.slice(0, MAX_ITEMS).map(cleanItem).filter(Boolean);
  if (!items.length) return { ok: false, code: 'empty' };
  return { ok: true, value: { email, token, optIn: body.optIn === true, items, truncated: body.items.length > MAX_ITEMS } };
}
