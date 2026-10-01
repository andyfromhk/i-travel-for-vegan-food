// "Email me my list" Worker.
//
// POST https://api.itravelforveganfood.com/email-list
//   { email, optIn, token, items: [...] }   (sent by core.js from the Saved drawer)
//
// Steps: only your website may call it -> check and clean the request -> rate limits ->
// Turnstile bot check -> fill in each restaurant's links from your CMS -> send the email ->
// (if they ticked the box) add them to Kit.
// Replies are always { ok: true } or { ok: false, code } so the website can show a friendly message.

import { readRequest } from './validate.js';
import { renderEmail, citiesIn } from './email.js';
import { addCmsLinks } from './lookup.js';
import { optIn } from './kit.js';

const allowedOrigins = (env) => String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

function corsHeaders(origin, allowed) {
  const headers = { 'Content-Type': 'application/json', Vary: 'Origin' };
  if (allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

const reply = (body, status, headers) => new Response(JSON.stringify(body), { status, headers });

// Returns true when allowed (or when the limiter isn't configured, e.g. in tests).
async function withinLimit(limiter, key) {
  if (!limiter) return true;
  try {
    const { success } = await limiter.limit({ key });
    return success;
  } catch (e) {
    return true; // never block readers because the limiter itself had a problem
  }
}

async function isHuman(token, ip, env, allowedHosts) {
  if (!env.TURNSTILE_SECRET) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const result = await response.json();
    return !!result.success && (!result.hostname || allowedHosts.includes(result.hostname));
  } catch (e) {
    return false;
  }
}

// Email Sending errors -> what the website should tell the reader.
function sendErrorCode(error) {
  const code = error && error.code;
  if (code === 'E_RATE_LIMIT_EXCEEDED' || code === 'E_DAILY_LIMIT_EXCEEDED') return { code: 'busy', status: 503 };
  if (code === 'E_RECIPIENT_SUPPRESSED' || code === 'E_VALIDATION_ERROR' || code === 'E_DELIVERY_FAILED') return { code: 'address', status: 400 };
  return { code: 'server', status: 500 };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = allowedOrigins(env);
    const headers = corsHeaders(origin, allowed);

    if (url.pathname === '/' && request.method === 'GET') return reply({ ok: true, service: 'itfvf-email-list' }, 200, headers);
    if (url.pathname !== '/email-list') return reply({ ok: false, code: 'not_found' }, 404, headers);
    if (request.method === 'OPTIONS') return new Response(null, { status: allowed.includes(origin) ? 204 : 403, headers });
    if (request.method !== 'POST') return reply({ ok: false, code: 'method' }, 405, headers);
    if (!allowed.includes(origin)) return reply({ ok: false, code: 'origin' }, 403, headers);

    let body;
    try { body = await request.json(); } catch (e) { return reply({ ok: false, code: 'invalid' }, 400, headers); }
    const parsed = readRequest(body);
    if (!parsed.ok) return reply({ ok: false, code: parsed.code }, 400, headers);
    const input = parsed.value;

    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (!(await withinLimit(env.LIMIT_BY_VISITOR, 'ip:' + ip)) || !(await withinLimit(env.LIMIT_BY_RECIPIENT, 'to:' + input.email))) {
      return reply({ ok: false, code: 'rate_limited' }, 429, headers);
    }

    const allowedHosts = allowed.map((o) => { try { return new URL(o).hostname; } catch (e) { return ''; } });
    if (!(await isHuman(input.token, ip, env, allowedHosts))) return reply({ ok: false, code: 'bot_check' }, 400, headers);

    // Each restaurant's Google Map Share Link (and a chain's store locator) from its page on your site.
    const items = await addCmsLinks(input.items, env);
    const email = renderEmail(items, { siteUrl: env.SITE_URL, logoUrl: env.LOGO_URL, optedIn: input.optIn, truncated: input.truncated });
    try {
      await env.EMAIL.send({
        to: input.email,
        from: { email: env.FROM_EMAIL, name: env.FROM_NAME },
        replyTo: env.REPLY_TO,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    } catch (error) {
      const { code, status } = sendErrorCode(error);
      console.error('Email Sending failed:', error && error.code, error && error.message);
      return reply({ ok: false, code }, status, headers);
    }

    if (input.optIn) {
      const cities = citiesIn(items); // cities of saved places and guides, e.g. "Saved: Tokyo"
      // Runs after the reply, so the reader isn't kept waiting for Kit.
      ctx.waitUntil(optIn(env, input.email, cities).catch((e) => console.error('Kit opt-in failed:', e.message)));
    }
    return reply({ ok: true }, 200, headers);
  },
};
