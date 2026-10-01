// Gets each restaurant's links from your CMS, so the email always uses them:
//   - the Google Map Share Link (the data-vt-maps attribute on your Restaurants template)
//   - for chains, the Store Locator link (data-vt-locator) and the Chain switch (data-vt-chain)
//
// It reads them from the restaurant's own page on your site, the same place core.js reads them,
// so it works however and wherever the reader saved the place. Results are remembered for a day.

import { cleanMapsUrl } from './validate.js';

const MAX_AT_ONCE = 6;      // pages fetched at the same time
const TIMEOUT_MS = 4000;    // give up on a slow page and fall back to what we have
const REMEMBER_FOR = 86400; // seconds (one day)

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function attribute(html, name) {
  const match = html.match(new RegExp('\\s' + name + '="([^"]*)"'));
  return match ? decode(match[1]).trim() : '';
}

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch (e) {
    return null;
  }
}

// Reads the links out of a restaurant page's HTML.
export function readRestaurantPage(html) {
  // The chain marker is a hidden div shown only when the Chain switch is on; Webflow keeps it in the
  // page with the class w-condition-invisible when the switch is off.
  const chainTag = html.match(/<[^>]*\sdata-vt-chain(?:="[^"]*")?[^>]*>/);
  return {
    mapsUrl: cleanMapsUrl(attribute(html, 'data-vt-maps')),
    locator: httpsUrl(attribute(html, 'data-vt-locator')),
    chain: !!chainTag && !/w-condition-invisible/.test(chainTag[0]),
  };
}

const slugOf = (item) => (item.page.match(/^\/restaurants\/([a-z0-9-]+)$/) || [])[1] || null;

async function detailsFor(slug, env) {
  const pageUrl = env.SITE_URL + '/restaurants/' + slug;
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(pageUrl + '?vt-email-links=1');
  if (cache) {
    const remembered = await cache.match(key);
    if (remembered) return remembered.json();
  }
  const response = await fetch(pageUrl, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': 'itfvf-email-list' } });
  if (!response.ok) return null;
  const details = readRestaurantPage(await response.text());
  if (cache) {
    await cache.put(key, new Response(JSON.stringify(details), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=' + REMEMBER_FOR },
    }));
  }
  return details;
}

// Returns the items with your CMS links filled in. Anything that can't be looked up keeps what it had,
// so the email always goes out.
export async function addCmsLinks(items, env) {
  const slugs = [...new Set(items.filter((i) => i.kind === 'place' && i.page).map(slugOf).filter(Boolean))];
  const found = new Map();
  for (let i = 0; i < slugs.length; i += MAX_AT_ONCE) {
    await Promise.all(slugs.slice(i, i + MAX_AT_ONCE).map(async (slug) => {
      try {
        const details = await detailsFor(slug, env);
        if (details) found.set(slug, details);
      } catch (e) {
        // slow or unreachable page: keep the link the browser sent
      }
    }));
  }
  return items.map((item) => {
    const details = item.kind === 'place' && item.page ? found.get(slugOf(item)) : null;
    if (!details) return item;
    const chain = item.chain || details.chain;
    return {
      ...item,
      chain,
      mapsUrl: chain ? null : details.mapsUrl || item.mapsUrl,
      locator: chain ? details.locator : null,
    };
  });
}
