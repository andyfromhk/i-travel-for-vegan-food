// Run with: npm test   (inside the worker folder)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { forgetTags } from '../src/kit.js';
import { cleanText, cleanMapsUrl } from '../src/validate.js';
import { readRestaurantPage } from '../src/lookup.js';

const SITE = 'https://www.itravelforveganfood.com';

function makeEnv(overrides = {}) {
  const sent = [];
  return {
    sent,
    FROM_EMAIL: 'hello@itravelforveganfood.com',
    FROM_NAME: 'I Travel For Vegan Food',
    REPLY_TO: 'hello@itravelforveganfood.com',
    SITE_URL: SITE,
    ALLOWED_ORIGINS: SITE + ',https://itravelforveganfood.com,https://itravelforveganfood.webflow.io',
    KIT_OPTIN_TAG_ID: '24152685',
    LOGO_URL: 'https://example.test/logo.png',
    TURNSTILE_SECRET: 'secret',
    KIT_API_KEY: 'kit-key',
    EMAIL: { async send(message) { sent.push(message); return { messageId: 'm1' }; } },
    ...overrides,
  };
}

// Restaurant pages as Webflow renders them: the template wrapper carries the CMS links.
const restaurantPage = ({ maps = '', locator = '', chain = false } = {}) =>
  '<html><body><div class="restaurant-hero" data-vt-place="x" data-vt-name="X" data-vt-maps="' + maps + '" data-vt-locator="' + locator + '">'
  + '<div data-vt-chain="1" class="' + (chain ? 'hidden-div' : 'hidden-div w-condition-invisible') + '"></div></div></body></html>';

const PAGES = {
  'neon-ramen': restaurantPage({ maps: 'https://maps.app.goo.gl/NEON-FROM-CMS' }),
  'gelato-messina': restaurantPage({ locator: 'https://www.gelatomessina.com/locations?country=au&amp;state=qld', chain: true }),
  'the-vegan-mary': restaurantPage({ maps: 'https://maps.app.goo.gl/MARY' }),
  'vegan-bistro-jangara': restaurantPage({ maps: 'https://maps.app.goo.gl/JANGARA' }),
};

// A stand-in for the internet: your restaurant pages, Turnstile and Kit.
function mockFetch({ human = true, hostname = 'www.itravelforveganfood.com', existingTags = [], pages = PAGES, brokenPages = [] } = {}) {
  const calls = [];
  const tags = [...existingTags];
  globalThis.fetch = async (url, options = {}) => {
    const u = String(url);
    calls.push({ url: u, method: options.method || 'GET', body: options.body });
    const page = u.match(/^https:\/\/www\.itravelforveganfood\.com\/restaurants\/([a-z0-9-]+)$/);
    if (page) {
      if (brokenPages.includes(page[1])) throw new Error('timeout');
      return pages[page[1]] ? new Response(pages[page[1]]) : new Response('Not found', { status: 404 });
    }
    if (u.includes('turnstile')) return new Response(JSON.stringify({ success: human, hostname }));
    if (u.endsWith('/v4/subscribers')) return new Response(JSON.stringify({ subscriber: { id: 1 } }), { status: 201 });
    if (u.includes('/v4/tags?')) return new Response(JSON.stringify({ tags, pagination: { has_next_page: false } }));
    if (u.endsWith('/v4/tags') && options.method === 'POST') {
      const name = JSON.parse(options.body).name;
      const tag = { id: 900 + tags.length, name };
      tags.push(tag);
      return new Response(JSON.stringify({ tag }), { status: 201 });
    }
    if (/\/v4\/tags\/[^/]+\/subscribers$/.test(u)) return new Response(JSON.stringify({ subscriber: { id: 1 } }), { status: 201 });
    return new Response('{}', { status: 404 });
  };
  return calls;
}

// Saved in this order: Brisbane, Tokyo, a general guide, Tokyo again, Chiang Mai guide, Brisbane again.
const items = [
  { kind: 'place', name: 'Neon Ramen', destination: 'brisbane', area: 'Everton Park', page: '/restaurants/neon-ramen' },
  { kind: 'place', name: 'Te Cor Gentil', destination: 'tokyo', mapsUrl: 'https://maps.app.goo.gl/TCG', from: '/map-guides/tokyo-vegan-friendly-bakeries#te-cor-gentil' },
  { kind: 'guide', name: 'Japan Travel Tips For Vegans', page: '/articles/vegan-japan-travel-tips' },
  { kind: 'guide', name: 'Best Vegan Cafes & Restaurants in Tokyo', destination: 'tokyo', page: '/articles/best-vegan-tokyo' },
  { kind: 'place', name: 'Vegan Bistro Jangara', destination: 'tokyo', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Jangara', page: '/restaurants/vegan-bistro-jangara' },
  { kind: 'guide', name: 'Vegan Chiang Mai Guide', destination: 'chiang-mai', page: '/articles/vegan-chiang-mai-guide' },
  { kind: 'place', name: 'Gelato Messina', destination: 'brisbane', page: '/restaurants/gelato-messina' },
  { kind: 'place', name: 'The Vegan Mary', destination: 'brisbane', page: '/restaurants/the-vegan-mary', status: 'Permanently Closed' },
];

function post(body, origin = SITE) {
  return new Request('https://api.itravelforveganfood.com/email-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': '203.0.113.9' },
    body: JSON.stringify(body),
  });
}

async function run(request, env) {
  const waits = [];
  const response = await worker.fetch(request, env, { waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  return { response, json: await response.json().catch(() => null) };
}

const order = (s, marks) => marks.map((m) => s.indexOf(m));
const ascending = (positions) => positions.every((p, i) => p > -1 && (i === 0 || p > positions[i - 1]));

test('sends the list: from hello@, reply-to, subject', async () => {
  mockFetch();
  const env = makeEnv();
  const { response, json } = await run(post({ email: 'Reader@Example.com', token: 't', items }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(json, { ok: true });
  const m = env.sent[0];
  assert.equal(m.to, 'reader@example.com');
  assert.deepEqual(m.from, { email: 'hello@itravelforveganfood.com', name: 'I Travel For Vegan Food' });
  assert.equal(m.replyTo, 'hello@itravelforveganfood.com');
  assert.equal(m.subject, 'Your saved vegan spots in Brisbane and Tokyo');
});

test('arranged by place: country book, then each city with its guides before its places', async () => {
  mockFetch();
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items }), env);
  const { html, text } = env.sent[0];
  // Australia has no book: Brisbane comes first. Then Japan's book, Tokyo guide, Tokyo places.
  // Then Thailand's book and the Chiang Mai guide. General guides last.
  const h = order(html, ['>Brisbane<', '>Neon Ramen<', '>Gelato Messina<', 'Heading to Japan?', '>Tokyo<', 'Best Vegan Cafes &amp; Restaurants in Tokyo', '>Te Cor Gentil<', '>Vegan Bistro Jangara<', 'Heading to Thailand?', '>Chiang Mai<', 'Vegan Chiang Mai Guide', '>More guides<', 'Japan Travel Tips For Vegans']);
  assert.ok(ascending(h), 'HTML order ' + h);
  const t = order(text, ['BRISBANE', 'Neon Ramen', 'Heading to Japan?', 'TOKYO', 'Guide: Best Vegan Cafes', 'Te Cor Gentil', 'Heading to Thailand?', 'CHIANG MAI', 'Guide: Vegan Chiang Mai Guide', 'MORE GUIDES', 'Guide: Japan Travel Tips']);
  assert.ok(ascending(t), 'text order ' + t);
  assert.match(html, /1 guide · 2 places/);
});

test("Google Maps uses each restaurant's Google Map Share Link from your CMS", async () => {
  mockFetch();
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items }), env);
  const { html, text } = env.sent[0];
  assert.match(html, /href="https:\/\/maps\.app\.goo\.gl\/NEON-FROM-CMS"/, 'link filled in when the browser had none');
  assert.match(html, /href="https:\/\/maps\.app\.goo\.gl\/JANGARA"/, 'CMS link replaces a search link');
  assert.doesNotMatch(html, /query=Jangara/);
  assert.match(html, /href="https:\/\/maps\.app\.goo\.gl\/TCG"/, "places without a restaurant page keep their guide's link");
  assert.match(text, /Google Maps: https:\/\/maps\.app\.goo\.gl\/NEON-FROM-CMS/);
});

test("chains: Find a location opens the store locator from your CMS", async () => {
  mockFetch();
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items }), env);
  const { html } = env.sent[0];
  assert.match(html, /href="https:\/\/www\.gelatomessina\.com\/locations\?country=au&amp;state=qld"[^>]*>Find a location</);
  assert.match(html, /Multiple locations/);
});

test('a restaurant page that is slow or missing never stops the email', async () => {
  mockFetch({ brokenPages: ['neon-ramen'], pages: { ...PAGES, 'the-vegan-mary': undefined } });
  const env = makeEnv();
  const { json } = await run(post({ email: 'a@example.com', token: 't', items }), env);
  assert.equal(json.ok, true);
  const { html } = env.sent[0];
  assert.match(html, /google\.com\/maps\/search\/\?api=1&amp;query=Neon%20Ramen%2C%20Brisbane/);
  assert.match(html, /google\.com\/maps\/search\/\?api=1&amp;query=The%20Vegan%20Mary%2C%20Brisbane/);
});

test('reading a restaurant page: share link, store locator, chain switch', () => {
  assert.deepEqual(readRestaurantPage(restaurantPage({ maps: 'https://maps.app.goo.gl/abc' })), { mapsUrl: 'https://maps.app.goo.gl/abc', locator: null, chain: false });
  const chain = readRestaurantPage(restaurantPage({ locator: 'https://example.com/stores?a=1&amp;b=2', chain: true }));
  assert.equal(chain.locator, 'https://example.com/stores?a=1&b=2');
  assert.equal(chain.chain, true);
  assert.equal(readRestaurantPage(restaurantPage({ maps: 'https://evil.example/x' })).mapsUrl, null, 'only Google Maps links');
  assert.equal(readRestaurantPage('<html>no attributes</html>').mapsUrl, null);
});

test('book block: cover image, Gumroad link with tracking', async () => {
  mockFetch();
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items }), env);
  const { html, text } = env.sent[0];
  assert.match(html, /<img src="https:\/\/cdn\.prod\.website-files\.com\/[^"]+vegan-foodie-guide-cover-japan\.webp" width="76" alt="Cover of The Vegan Foodie Guide To Japan"/);
  assert.match(html, /vegan-foodie-guide-cover-thailand\.webp/);
  assert.match(html, /href="https:\/\/itravelforveganfood\.gumroad\.com\/l\/the-vegan-foodie-guide-to-japan\?utm_source=saved-list-email/);
  assert.match(text, /https:\/\/itravelforveganfood\.gumroad\.com\/l\/the-vegan-foodie-guide-to-thailand\?utm_source=saved-list-email/);
  assert.doesNotMatch(html, /Heading to Australia/);
});

test('design: white background throughout, wider text area, bigger names, pill buttons', async () => {
  mockFetch();
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items }), env);
  const { html } = env.sent[0];
  assert.doesNotMatch(html, /#f4f6f0/i, 'no light green background');
  assert.match(html, /<body style="margin:0;padding:0;background:#ffffff;">/);
  assert.match(html, /max-width:640px/);
  assert.match(html, /padding:0 16px 8px;/);
  assert.match(html, /font-size:19px[^"]*">Neon Ramen</);
  for (const label of ['Google Maps', 'Restaurant page', 'Find a location', 'In the guide', 'Read the guide']) {
    const style = (html.match(new RegExp('<a href="[^"]+" style="([^"]+)">' + label + '</a>')) || [])[1] || '';
    assert.match(style, /border-radius:999px/, label + ' is a pill');
    assert.match(style, /font-weight:500/, label);
  }
});

test('one-off footer when not opted in, and Kit is not touched', async () => {
  const calls = mockFetch();
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items, optIn: false }), env);
  assert.match(env.sent[0].html, /one-off email/);
  assert.equal(calls.filter((c) => c.url.includes('api.kit.com')).length, 0);
});

test('opt-in: subscriber, Saved list tag, and a tag for every city (places and guides)', async () => {
  forgetTags();
  const calls = mockFetch({ existingTags: [{ id: 555, name: 'Saved: Brisbane' }] });
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items, optIn: true }), env);
  assert.match(env.sent[0].html, /newsletter/);
  const kit = calls.filter((c) => c.url.includes('api.kit.com'));
  assert.ok(kit.some((c) => c.url.endsWith('/v4/subscribers') && c.method === 'POST'));
  assert.ok(kit.some((c) => c.url.endsWith('/v4/tags/24152685/subscribers')));
  assert.ok(kit.some((c) => c.url.endsWith('/v4/tags/555/subscribers')), 'existing city tag reused');
  const created = kit.filter((c) => c.url.endsWith('/v4/tags') && c.method === 'POST').map((c) => JSON.parse(c.body).name);
  assert.deepEqual(created, ['Saved: Tokyo', 'Saved: Chiang Mai']);
});

test('guides only: subject names their cities', async () => {
  mockFetch();
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items: items.filter((i) => i.kind === 'guide') }), env);
  assert.equal(env.sent[0].subject, 'Your saved vegan guides for Tokyo and Chiang Mai');
});

test('only your website may use it (CORS)', async () => {
  mockFetch();
  const env = makeEnv();
  const preflightOk = await worker.fetch(new Request('https://api.itravelforveganfood.com/email-list', { method: 'OPTIONS', headers: { Origin: 'https://itravelforveganfood.webflow.io' } }), env, {});
  assert.equal(preflightOk.status, 204);
  const preflightBad = await worker.fetch(new Request('https://api.itravelforveganfood.com/email-list', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env, {});
  assert.equal(preflightBad.status, 403);
  const { response } = await run(post({ email: 'a@example.com', token: 't', items }, 'https://evil.example'), env);
  assert.equal(response.status, 403);
  assert.equal(env.sent.length, 0);
});

test('failed bot check or a token for another website: nothing sent', async () => {
  mockFetch({ human: false });
  let env = makeEnv();
  let r = await run(post({ email: 'a@example.com', token: 't', items }), env);
  assert.equal(r.json.code, 'bot_check');
  mockFetch({ hostname: 'evil.example' });
  env = makeEnv();
  r = await run(post({ email: 'a@example.com', token: 't', items }), env);
  assert.equal(r.json.code, 'bot_check');
  assert.equal(env.sent.length, 0);
});

test('invalid email, empty list, missing token', async () => {
  mockFetch();
  const env = makeEnv();
  assert.equal((await run(post({ email: 'not-an-email', token: 't', items }), env)).json.code, 'invalid_email');
  assert.equal((await run(post({ email: 'a@example.com', token: 't', items: [] }), env)).json.code, 'empty');
  assert.equal((await run(post({ email: 'a@example.com', items }), env)).json.code, 'bot_check');
  assert.equal(env.sent.length, 0);
});

test('rate limits: per visitor and per email address', async () => {
  mockFetch();
  const env = makeEnv({ LIMIT_BY_RECIPIENT: { async limit() { return { success: false }; } } });
  const r = await run(post({ email: 'a@example.com', token: 't', items }), env);
  assert.equal(r.response.status, 429);
  assert.equal(r.json.code, 'rate_limited');
});

test('Email Sending limits reached: friendly "busy" code', async () => {
  mockFetch();
  const env = makeEnv({ EMAIL: { async send() { const e = new Error('limit'); e.code = 'E_DAILY_LIMIT_EXCEEDED'; throw e; } } });
  const r = await run(post({ email: 'a@example.com', token: 't', items }), env);
  assert.equal(r.response.status, 503);
  assert.equal(r.json.code, 'busy');
});

test('spam protection: no foreign links, no web addresses in names, no forged pages', async () => {
  mockFetch();
  const env = makeEnv();
  const evil = [
    { kind: 'place', name: 'Free prize at evil.com <script>x</script>', destination: 'tokyo', mapsUrl: 'https://evil.com/maps', page: 'https://evil.com/x', from: 'javascript:alert(1)' },
    { kind: 'place', name: 'Visit www.phish.net now', destination: 'mars', mapsUrl: 'https://www.google.com.evil.com/maps/x', locator: 'https://evil.com/stores', chain: true },
    { kind: 'guide', name: 'Guide', page: '//evil.com/articles/x' },
  ];
  await run(post({ email: 'a@example.com', token: 't', items: evil }), env);
  const m = env.sent[0];
  assert.doesNotMatch(m.html + m.text, /evil|phish|<script>|javascript:/i);
  assert.match(m.html, /Free prize at/);
  assert.match(m.html, /Other places/);
});

test('cleaning helpers', () => {
  assert.equal(cleanText('Onwa  <b>Nara</b>', 50), 'Onwa bNara/b');
  assert.equal(cleanText('Visit https://x.io/a now', 50), 'Visit now');
  assert.equal(cleanMapsUrl('https://maps.app.goo.gl/abc'), 'https://maps.app.goo.gl/abc');
  assert.equal(cleanMapsUrl('https://www.google.co.jp/maps/place/x'), 'https://www.google.co.jp/maps/place/x');
  assert.equal(cleanMapsUrl('http://maps.app.goo.gl/abc'), null);
  assert.equal(cleanMapsUrl('https://google.com.evil.io/maps'), null);
  assert.equal(cleanMapsUrl('https://www.google.com/search?q=x'), null);
});

test('long lists are capped at 60 items, with a note', async () => {
  mockFetch();
  const env = makeEnv();
  const many = Array.from({ length: 70 }, (_, i) => ({ kind: 'place', name: 'Place ' + i, destination: 'tokyo', page: '/restaurants/p' + i }));
  await run(post({ email: 'a@example.com', token: 't', items: many }), env);
  assert.equal((env.sent[0].html.match(/>Restaurant page</g) || []).length, 60);
  assert.match(env.sent[0].html, /first 60 items/);
});

test('health check', async () => {
  const response = await worker.fetch(new Request('https://api.itravelforveganfood.com/'), makeEnv(), {});
  assert.deepEqual(await response.json(), { ok: true, service: 'itfvf-email-list' });
});
