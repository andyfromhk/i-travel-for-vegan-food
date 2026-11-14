# Launch checklist: moving itravelforveganfood.com from Webflow to the new site

You do every step here yourself; nothing in this repository changes DNS or Webflow. The switch takes about
15 minutes, and putting the saved Webflow records back undoes it in minutes.

Tick each box as you go. Times are rough.

---

## 1. Go / no-go (before you pick a date)

- [ ] The checklists in this folder pass on the preview, on a computer and on a phone: `core-checklist.md`,
      `guide-checklist.md`, `destination-checklist.md`, `email-checklist.md`, plus the "New things" list in
      `preview-setup.md`.
- [ ] **Maps work on the preview:** a map guide, a destination's restaurant map, and the small map on a
      restaurant page (that one needs the Maps Embed API switched on; see `preview-setup.md`).
- [ ] **Newsletter form** (footer) on the preview: sign up with a test address on a page that isn't about Japan,
      Thailand, Taiwan or Hong Kong (the home page). It appears in Kit with the tag `Website newsletter`. If the
      form says "Oops", the email Worker doesn't have the latest update yet or doesn't know the preview address:
      deploy it and check `ALLOWED_ORIGINS` (`email-checklist.md`).
- [ ] **Cheat sheet:** sign up on a Japan page. "Your vegan Japan cheat sheet" arrives, and Kit shows the address
      with `Website newsletter` and `Cheat sheet: Japan` (`email-checklist.md`, "Cheat-sheet emails").
- [ ] **Contact form** (`/about`): send a test message. It arrives at the address set up in Web3Forms.
- [ ] **Pages CMS:** create a test restaurant and a test guide, see them on the preview, then delete them
      (`editing-guide.md`).
- [ ] **Form submissions exported from Webflow** (Site settings → Forms → each form → Export CSV). The footer
      sign-ups from before the move only exist there.

## 2. The day before

- [ ] **Stop editing in Webflow** from now on. Changes made in Webflow after this point won't reach the new site.
- [ ] **Refresh the content from Webflow.** Ask Claude, in a session with the Webflow connection and this
      repository, to "refresh the content from Webflow before launch". It reads Webflow (read-only), re-runs
      the conversion and the image download, checks parity, and pushes. The converter reproduces every fix made
      since the first conversion, so nothing is lost.
- [ ] Check the refreshed preview: a restaurant or guide you changed recently shows your latest version.

## 3. On the day: before the switch (about 20 minutes)

### Put the site on `main`

- [ ] On GitHub, merge `astro-migration` into `main` (open a pull request and merge it).
- [ ] Cloudflare dashboard → **Workers & Pages** → **itfvf-site** → **Settings** → **Build** → branch control:
      set the **production branch** to `main`.
- [ ] Wait for that build to finish (**Deployments** → **View build history**) and check the preview address
      shows the site.
- [ ] In Pages CMS, switch the branch to `main` (top left). From now on, saving there publishes to the live site.

### Save the current DNS (this is your way back)

- [ ] Cloudflare dashboard → your domain → **DNS** → **Records** → **Import and Export** → **Export**. Keep the
      file somewhere safe.
- [ ] Write down the records that point the website at Webflow. They usually look like this; copy whatever is
      actually there:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `itravelforveganfood.com` (`@`) | `75.2.70.75` | DNS only |
| A | `itravelforveganfood.com` (`@`) | `99.83.190.102` | DNS only |
| CNAME | `www` | `proxy-ssl.webflow.com` | DNS only |

### Records to leave alone

Only the website records above change. **Don't touch any of these**, even though some sit on the same name:

| What | Records |
|---|---|
| Email Sending (the "Email me my list" emails) | MX and TXT on `cf-bounce`, and the TXT on `_dmarc` |
| Email Routing (forwarding to your inbox, e.g. `hello@`) | MX and TXT on `itravelforveganfood.com` |
| The email Worker | `api` (a Worker custom domain) |
| Verification | TXT records for Google, Kit, Pinterest and others |
| Webflow's own check | TXT on `_webflow`: leave it until Webflow is cancelled |

## 4. The switch (about 15 minutes)

The site is unreachable for a minute or two between steps 1 and 2.

1. [ ] **DNS:** delete the `www` CNAME that points to `proxy-ssl.webflow.com`.
2. [ ] **Workers & Pages** → **itfvf-site** → **Settings** → **Domains & Routes** → **Add** → **Custom domain** →
       `www.itravelforveganfood.com`. Cloudflare creates the DNS record and the certificate itself. Wait until
       the domain shows as active (a few minutes).
3. [ ] **DNS:** delete the two **A** records on `itravelforveganfood.com` that point to Webflow. Only the A
       records: the MX and TXT records on the same name stay.
4. [ ] **DNS:** add a record so the bare domain can redirect:
       Type `A`, Name `@`, IPv4 address `192.0.2.1`, Proxy status **Proxied** (orange cloud).
       (`192.0.2.1` is a placeholder that's never contacted; Cloudflare answers with the redirect first.)
5. [ ] **Rules** → **Redirect Rules** → **Create rule**:
       - Rule name: `Bare domain to www`
       - When incoming requests match: **Hostname** equals `itravelforveganfood.com`
       - Then: **Dynamic**, expression `concat("https://www.itravelforveganfood.com", http.request.uri.path)`
       - Status code **301**, and tick **Preserve query string**
6. [ ] **SSL/TLS** → **Edge Certificates** → **Always Use HTTPS**: on.

### Check straight away

- [ ] `https://www.itravelforveganfood.com` shows the new site (look for the new menu).
- [ ] `https://itravelforveganfood.com/articles?test=1` lands on `https://www.itravelforveganfood.com/articles?test=1`.
- [ ] `http://www.itravelforveganfood.com/about` lands on the `https://` address.
- [ ] Old addresses still work: `/map-guides-itineraries`, `/blog-posts/vegan-tokyo-guide`,
      `/tokyo-vegan-guide`, a restaurant you know.
- [ ] A made-up address (`/abc123`) shows the "This page doesn't exist" page.
- [ ] Maps: a map guide, a destination's restaurant map, a restaurant's small map.
- [ ] Save a place, open Saved, and send "Email me my list" to yourself.
- [ ] Newsletter and contact forms, once each.
- [ ] Google Analytics → **Realtime** shows your visit.

If something is badly wrong, see [Rolling back](#6-rolling-back).

## 5. Same day, after the checks

- [ ] **Email Worker images:** in `worker/wrangler.jsonc`, change `LOGO_URL` to
      `https://www.itravelforveganfood.com/site/brand/itfvf-logo.png`, and in `worker/src/data.js` change each
      book's `cover` to the matching file on the new site (`https://www.itravelforveganfood.com/site/books/japan.webp`
      and so on). Both still point at Webflow's file storage, which goes away when Webflow is cancelled. Then
      deploy the email Worker.
- [ ] **Google Search Console** → your property → **Sitemaps** → submit `sitemap.xml` (same address as before).
- [ ] Search Console → **URL inspection** → paste the home page, a destination and a popular guide, and click
      **Request indexing** on each.
- [ ] **Turn off the preview address,** so search engines only see one copy of the site: **itfvf-site** →
      **Settings** → **Domains & Routes** → `workers.dev` → **Disable**. (Every page already tells search engines
      the www address is the real one, so this is tidiness more than urgency. Turn it back on if you want
      branch previews later.)
- [ ] Allowed addresses need no change: the Maps key, Turnstile and the email Worker already allow
      `itravelforveganfood.com`. Leave the preview entries until Webflow is cancelled, then remove them.

## 6. Rolling back

Use this only if the new site has a serious problem you can't fix quickly. It takes about five minutes.

1. **Rules** → **Redirect Rules** → turn off `Bare domain to www`.
2. **Workers & Pages** → **itfvf-site** → **Settings** → **Domains & Routes** → remove
   `www.itravelforveganfood.com`.
3. **DNS:** delete the `192.0.2.1` record, then add back the Webflow records you wrote down in step 3.
4. Webflow serves the site again within minutes.

This only works while the Webflow site plan is active and the domain is still connected in Webflow, so keep
both until the fallback period ends.

## 7. The next two weeks

- [ ] **Keep Webflow** published, with the domain connected and the plan active, for 2–4 weeks.
- [ ] **Daily:** Search Console → **Pages** → look at **Not found (404)** and **Page with redirect**. Cloudflare →
      your domain → **Analytics & Logs** shows traffic and response codes too.
- [ ] **For each address that should exist but shows 404:** add a line to `migration/redirects/webflow-301.csv`
      (`old address,new address`), commit, and the next build adds the redirect. Or ask Claude to.
- [ ] Watch Search Console → **Performance** for a drop in clicks. Small wobbles for a week or two are normal
      after a move.

## 8. After the fallback period

- [ ] Cancel the Webflow site plan (and the workspace plan if nothing else uses it).
- [ ] Delete the `_webflow` TXT record.
- [ ] Remove the preview address from the Maps key, Turnstile and `ALLOWED_ORIGINS`, and remove
      `https://itravelforveganfood.webflow.io` from `ALLOWED_ORIGINS`.
- [ ] Remove the old Webflow scripts at the top of the repository (`core.js`, `guide.js`, `destination.js`):
      the live Webflow site loads them from jsDelivr, so they have to stay until Webflow is gone.
- [ ] **Only then**, if you want, make the repository private. (Before that, jsDelivr couldn't serve those
      scripts to Webflow.) Pages CMS and Cloudflare keep working with a private repository.
