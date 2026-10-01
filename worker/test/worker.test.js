// Run with: npm test   (inside the worker folder)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { forgetTags } from '../src/kit.js';
import { cleanText, cleanMapsUrl } from '../src/validate.js';

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

// A stand-in for the internet: Turnstile and Kit.
function mockFetch({ human = true, hostname = 'www.itravelforveganfood.com', existingTags = [] } = {}) {
  const calls = [];
  const tags = [...existingTags];
  globalThis.fetch = async (url, options = {}) => {
    const u = String(url);
    calls.push({ url: u, method: options.method || 'GET', body: options.body });
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

const items = [
  { kind: 'place', name: 'Neon Ramen', destination: 'brisbane', area: 'Everton Park', mapsUrl: 'https://maps.app.goo.gl/NEON', page: '/restaurants/neon-ramen' },
  { kind: 'place', name: 'Te Cor Gentil', destination: 'tokyo', mapsUrl: 'https://maps.app.goo.gl/TCG', from: '/map-guides/tokyo-vegan-friendly-bakeries#te-cor-gentil' },
  { kind: 'place', name: 'Gelato Messina', destination: 'brisbane', chain: true, mapsUrl: 'https://store.example/locations', page: '/restaurants/gelato-messina' },
  { kind: 'place', name: 'The Vegan Mary', destination: 'brisbane', page: '/restaurants/the-vegan-mary', status: 'Permanently Closed' },
  { kind: 'guide', name: 'Vegan Chiang Mai Guide', page: '/articles/vegan-chiang-mai-guide' },
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

test('sends the list: from hello@, reply-to, subject and content', async () => {
  mockFetch();
  const env = makeEnv();
  const { response, json } = await run(post({ email: 'Reader@Example.com', token: 't', items }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(json, { ok: true });
  assert.equal(env.sent.length, 1);
  const m = env.sent[0];
  assert.equal(m.to, 'reader@example.com');
  assert.deepEqual(m.from, { email: 'hello@itravelforveganfood.com', name: 'I Travel For Vegan Food' });
  assert.equal(m.replyTo, 'hello@itravelforveganfood.com');
  assert.equal(m.subject, 'Your saved vegan spots in Brisbane and Tokyo');
  assert.match(m.html, /href="https:\/\/maps\.app\.goo\.gl\/NEON"/);
  assert.match(m.html, /href="https:\/\/www\.itravelforveganfood\.com\/restaurants\/neon-ramen"/);
  assert.match(m.html, /In the guide/);
  assert.match(m.html, /Permanently Closed/);
  assert.match(m.html, /Vegan Chiang Mai Guide/);
  assert.match(m.text, /Google Maps: https:\/\/maps\.app\.goo\.gl\/NEON/);
  assert.match(m.text, /Restaurant page: https:\/\/www\.itravelforveganfood\.com\/restaurants\/neon-ramen/);
});

test('order: saved guides, then the book, then places by city (HTML and text)', async () => {
  mockFetch();
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items }), env);
  const { html, text } = env.sent[0];
  const order = (s, marks) => marks.map((m) => s.indexOf(m));
  const h = order(html, ['Saved guides', 'Heading to Japan?', 'Brisbane  ·', 'Tokyo  ·']);
  assert.ok(h.every((i) => i > -1) && h[0] < h[1] && h[1] < h[2] && h[2] < h[3], 'HTML order ' + h);
  const t = order(text, ['SAVED GUIDES', 'Heading to Japan?', 'BRISBANE', 'TOKYO']);
  assert.ok(t.every((i) => i > -1) && t[0] < t[1] && t[1] < t[2] && t[2] < t[3], 'text order ' + t);
});

test('book block links straight to Gumroad, with tracking', async () => {
  mockFetch();
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items }), env);
  const m = env.sent[0];
  assert.match(m.html, /The Vegan Foodie Guide To Japan/);
  assert.match(m.html, /href="https:\/\/itravelforveganfood\.gumroad\.com\/l\/the-vegan-foodie-guide-to-japan\?utm_source=saved-list-email/);
  assert.match(m.text, /https:\/\/itravelforveganfood\.gumroad\.com\/l\/the-vegan-foodie-guide-to-japan\?utm_source=saved-list-email/);
  assert.doesNotMatch(m.html, /Heading to Australia/); // no Australia book
});

test('design: bigger names and pill-shaped grey link buttons', async () => {
  mockFetch();
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items }), env);
  const { html } = env.sent[0];
  assert.match(html, /font-size:19px[^"]*">Neon Ramen</);
  assert.match(html, /font-size:19px[^"]*">Vegan Chiang Mai Guide</);
  for (const label of ['Google Maps', 'Restaurant page', 'Find a location', 'In the guide', 'Read the guide']) {
    const re = new RegExp('<a href="[^"]+" style="([^"]+)">' + label + '</a>');
    const style = (html.match(re) || [])[1] || '';
    assert.match(style, /border-radius:999px/, label + ' is a pill');
    assert.match(style, /font-weight:500/, label + ' uses a lighter weight');
    assert.match(style, /color:#5f6b62/, label + ' is grey');
    assert.match(style, /font-size:13px/, label + ' is small');
  }
  assert.doesNotMatch(html, /&nbsp;\|&nbsp;/); // no more "|" separators
  assert.match(html, />See the book</);
});

test('chains link to a Google Maps search, never to a link the browser sent', async () => {
  mockFetch();
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items }), env);
  const m = env.sent[0];
  assert.doesNotMatch(m.html, /store\.example/);
  assert.match(m.html, /Find a location/);
  assert.match(m.html, /google\.com\/maps\/search\/\?api=1&amp;query=Gelato%20Messina%2C%20Brisbane/);
});

test('one-off footer when not opted in, and Kit is not touched', async () => {
  const calls = mockFetch();
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items, optIn: false }), env);
  assert.match(env.sent[0].html, /one-off email/);
  assert.equal(calls.filter((c) => c.url.includes('api.kit.com')).length, 0);
});

test('opt-in: subscriber created, Saved list tag, and a tag per city (created when missing)', async () => {
  forgetTags();
  const calls = mockFetch({ existingTags: [{ id: 555, name: 'Saved: Brisbane' }] });
  const env = makeEnv();
  await run(post({ email: 'a@example.com', token: 't', items, optIn: true }), env);
  assert.match(env.sent[0].html, /newsletter/);
  const kit = calls.filter((c) => c.url.includes('api.kit.com'));
  assert.ok(kit.some((c) => c.url.endsWith('/v4/subscribers') && c.method === 'POST'));
  assert.ok(kit.some((c) => c.url.endsWith('/v4/tags/24152685/subscribers')));
  assert.ok(kit.some((c) => c.url.endsWith('/v4/tags/555/subscribers')), 'existing city tag reused');
  const created = kit.find((c) => c.url.endsWith('/v4/tags') && c.method === 'POST');
  assert.equal(JSON.parse(created.body).name, 'Saved: Tokyo');
  assert.ok(kit.some((c) => /\/v4\/tags\/9\d\d\/subscribers$/.test(c.url)), 'new city tag used');
});

test('only your website may use it (CORS)', async () => {
  mockFetch();
  const env = makeEnv();
  const preflightOk = await worker.fetch(new Request('https://api.itravelforveganfood.com/email-list', { method: 'OPTIONS', headers: { Origin: 'https://itravelforveganfood.webflow.io' } }), env, {});
  assert.equal(preflightOk.status, 204);
  assert.equal(preflightOk.headers.get('Access-Control-Allow-Origin'), 'https://itravelforveganfood.webflow.io');
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
  assert.equal(env.sent.length, 0);
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
    { kind: 'place', name: 'Visit www.phish.net now', destination: 'mars', mapsUrl: 'https://www.google.com.evil.com/maps/x' },
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
  assert.equal(cleanMapsUrl('https://www.google.com/maps/place/x'), 'https://www.google.com/maps/place/x');
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
