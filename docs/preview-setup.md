# Putting the new site on a preview address

The site builds and passes its checks, but it isn't online yet: publishing it needs your Cloudflare account.
These steps put it on a private preview address (`https://itfvf-site.<your-subdomain>.workers.dev`).
Nothing here touches the live Webflow site or your DNS.

## 1. Create the Worker (about 5 minutes)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository**.
2. Choose `andyfromhk/i-travel-for-vegan-food` and the branch `astro-migration`.
3. Settings:
   - **Project name:** `itfvf-site`
   - **Root directory:** `/` (leave empty)
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
4. Under **Build watch paths**, exclude `worker/*`, so changes to the email Worker don't rebuild the website.
   On the email Worker's own build settings, set the watch path to `worker/*` for the same reason.

The first build takes a few minutes because it uploads the 4,920 images. Later builds only upload what changed.

## 2. Allow the preview address (about 10 minutes)

Three services only answer websites they know. Add the preview address to each:

| Service | Where | What to add |
|---|---|---|
| Google Maps | Google Cloud console → APIs & Services → Credentials → the Maps key → Website restrictions | `https://itfvf-site.<your-subdomain>.workers.dev/*` |
| Turnstile | Cloudflare dashboard → Turnstile → the widget → Hostnames | `itfvf-site.<your-subdomain>.workers.dev` |
| Email Worker | `worker/wrangler.jsonc` → `ALLOWED_ORIGINS` | `https://itfvf-site.<your-subdomain>.workers.dev` (add to the end, after a comma) |

Until the Maps key is updated, maps show "Oops! Something went wrong" on the preview. Everything else works.

## 3. What to test

The checklists in this folder are the tests: `core-checklist.md`, `guide-checklist.md`,
`destination-checklist.md` and `email-checklist.md`. Go through them on the preview, on a computer and on a phone.

New things that aren't in those checklists:

- **Vegan Foodie Guides** (`/articles`): search, guide type, category and destination filters; a category that
  doesn't apply to the chosen guide type is greyed out; the address bar changes as you filter.
- **Destinations** (`/destinations`): the four groups, and the count line on each card.
- **Restaurant map** on a destination page: Filters, Sort by, Saved.
- **Newsletter form** in the footer and the **contact form** on `/about`.
- **Old addresses**: try a few from `public/_redirects`, for example `/map-guides-itineraries` and `/tokyo-vegan-guide`.

## Running the site on your own computer

```bash
npm install
```

```bash
npm run dev
```

Then open `http://localhost:4321`. Maps don't load there either, for the same reason as above.

```bash
npm run build
```

builds the site into `dist/` and rewrites `public/_redirects`.

```bash
node migration/scripts/check-parity.mjs
```

compares the build with the old site and writes `docs/parity-report.md`.
