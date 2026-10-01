// Adds a reader to Kit, only when they ticked "Also send me new guides".
// They get the "Saved list" tag (ID in wrangler.jsonc) and a tag per city in their list,
// for example "Saved: Tokyo". City tags are created in Kit the first time they're needed.

const API = 'https://api.kit.com/v4';
const tagIds = new Map(); // tag name -> id, remembered while this Worker instance is warm

async function kit(env, path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Kit-Api-Key': env.KIT_API_KEY },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('Kit ' + (options.method || 'GET') + ' ' + path + ' failed: ' + response.status);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function loadTags(env) {
  let cursor = null;
  do {
    const data = await kit(env, '/tags?per_page=1000' + (cursor ? '&after=' + encodeURIComponent(cursor) : ''));
    (data.tags || []).forEach((tag) => tagIds.set(tag.name, tag.id));
    cursor = data.pagination && data.pagination.has_next_page ? data.pagination.end_cursor : null;
  } while (cursor);
}

async function tagIdFor(env, name) {
  if (!tagIds.has(name)) await loadTags(env);
  if (tagIds.has(name)) return tagIds.get(name);
  try {
    const data = await kit(env, '/tags', { method: 'POST', body: JSON.stringify({ name }) });
    if (data.tag && data.tag.id) tagIds.set(name, data.tag.id);
  } catch (e) {
    await loadTags(env); // someone else may have just created it
  }
  return tagIds.get(name) || null;
}

async function tag(env, tagId, email) {
  await kit(env, '/tags/' + encodeURIComponent(tagId) + '/subscribers', { method: 'POST', body: JSON.stringify({ email_address: email }) });
}

export async function optIn(env, email, cityNames) {
  if (!env.KIT_API_KEY) throw new Error('KIT_API_KEY is not set');
  // Creates the subscriber, or returns the existing one.
  await kit(env, '/subscribers', { method: 'POST', body: JSON.stringify({ email_address: email }) });
  if (env.KIT_OPTIN_TAG_ID) await tag(env, env.KIT_OPTIN_TAG_ID, email);
  for (const city of cityNames) {
    const id = await tagIdFor(env, 'Saved: ' + city);
    if (id) await tag(env, id, email);
  }
}

// For tests.
export function forgetTags() { tagIds.clear(); }
