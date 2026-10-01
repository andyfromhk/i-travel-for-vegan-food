# "Email me my list": deploy and test checklist

## Updating the Worker to v1.1.0 (you are here)

What's new:
- **Google Maps** now always uses each restaurant's **Google Map Share Link** from your CMS. The Worker reads it from
  the restaurant's page on your site (the `data-vt-maps` attribute you added), so it works no matter where the
  reader saved the place. Chains' **Find a location** opens their **Store Locator** link the same way.
- The email is arranged **by place**: each country's book first, then each city with its guides before its
  restaurants. Guides without a city come at the end.
- **Book covers** in the book blocks, and a plain **white** layout with a wider text area.

Steps:
1. [ ] Download the new `i-travel-for-vegan-food.zip` and unzip it. On GitHub, **Add file > Upload files**, drag in
       the `worker` folder (it now has a new file, `src/lookup.js`), `README.md` and the `docs` folder, then commit.
2. [ ] That's all for the Worker: pushing to GitHub redeploys it automatically. (Optionally, create a release tagged
       `v1.8.0` to keep your history tidy. Your website's script lines don't change.)
3. [ ] **Logo:** once you have the PNG logo's link, put it in `LOGO_URL` in `worker/wrangler.jsonc` (or send it to me).
4. [ ] Test by emailing yourself a list with places and guides from two countries, for example Tokyo and Bangkok:
   - [ ] The order is: Japan book, Tokyo guides, Tokyo places, then the next city, then the Thailand book, and so on.
   - [ ] **Google Maps** on a restaurant opens its Google Map Share Link, even for a place saved from a destination
         page or an article.
   - [ ] A chain's **Find a location** opens its store locator.
   - [ ] The book blocks show the covers.
   - [ ] The email is white throughout, with no green background.

Good to know:
- The first email with a lot of restaurants can take a second or two longer while their pages are looked up.
  Each restaurant's links are then remembered for a day.
- A restaurant with no Google Map Share Link in the CMS still gets a Google Maps search for its name and address.
- If you change a restaurant's share link, emails pick it up within a day.

---

# First-time setup (done)

This release adds the **Worker** (in the `worker/` folder) and **core.js v1.3.0**, which adds "Email me my list" to
the Saved drawer. Nothing changes on your live site until Part E.

Already done (from the setup guide): Workers Paid plan, Email Sending turned on for your domain,
`hello@itravelforveganfood.com` forwarding, the Kit API key and `Saved list` tag, and the Turnstile widget.

---

## Part A: GitHub

### What goes where

The Worker is a **folder** with smaller folders inside it. Its files must keep this layout:

```
worker/
  .gitignore
  package.json
  wrangler.jsonc
  src/
    data.js
    email.js
    index.js
    kit.js
    validate.js
  test/
    worker.test.js
  preview/
    make-preview.js
    sample-email.html
    sample-email.txt
```

The easiest way to get it right is to download **`i-travel-for-vegan-food.zip`**, which has the whole repository
with every folder in place, and unzip it on your computer.

### Uploading

- [ ] On GitHub, open the repository and choose **Add file > Upload files**.
- [ ] From the unzipped folder, drag in the **`worker` folder itself** (not the files inside it), plus `core.js`,
      `README.md` and the `docs` folder. GitHub keeps the folders as they are, and replaces files that already exist
      with the new versions.
- [ ] Commit the changes. Then check on GitHub that you can click into `worker > src` and see the five `.js` files.
- [ ] Create a release tagged **`v1.7.0`**.

---

## Part B: Create the Worker in Cloudflare

1. [ ] In Cloudflare, go to **Workers & Pages > Create** and choose the option to import a repository. If asked,
       connect GitHub and allow access to `i-travel-for-vegan-food`.
2. [ ] Settings:
       - **Project name:** `itfvf-email-list` (it must match the name in `wrangler.jsonc`)
       - **Root directory:** `worker`
       - **Build command:** leave empty
       - **Deploy command:** `npx wrangler deploy` (usually filled in already)
       - **Branch:** `main`
3. [ ] Deploy. This also creates the address `api.itravelforveganfood.com` for you, because it's set in
       `wrangler.jsonc`. If Cloudflare says a DNS record for `api` already exists, delete that record and deploy again.
4. [ ] Add the two secrets: the Worker's **Settings > Variables and Secrets > Add**, type **Secret**:
       - `KIT_API_KEY`: your Kit v4 key
       - `TURNSTILE_SECRET`: your Turnstile **Secret Key**
5. [ ] Check it's alive: open `https://api.itravelforveganfood.com/` in your browser. You should see
       `{"ok":true,"service":"itfvf-email-list"}`.

From now on, every change to the `worker/` folder that you push to GitHub redeploys the Worker automatically.
Change settings in `worker/wrangler.jsonc`, not in the dashboard: the next deploy would replace dashboard edits.
Secrets are the exception. They're kept between deploys.

---

## Part C: The website

- [ ] **Site settings > Custom code > Footer:** change the core line from `@v1.3.0` to `@v1.7.0`.
- [ ] Publish to **staging only** (`itravelforveganfood.webflow.io`).

---

## Part D: Test on staging

On the staging site, save a few places in two countries (include one in Japan), one restaurant marked closed if you
have one, and a guide. Then open **Saved**.

**The form**
- [ ] **Email me my list** is the first button in the Saved drawer.
- [ ] Tapping it shows the form: your email address, and an **unticked** "Also send me new vegan guides" box.
- [ ] The robot check is usually invisible. If Cloudflare is unsure, a small box asks for one tap.
- [ ] A wrong address (e.g. `abc`) shows "That email address doesn't look quite right."

**The email (box unticked, sent to yourself)**
- [ ] "Sent!" appears, and the email arrives within a minute or two. Check spam the first time; if it's there, mark
      it "Not spam", which helps future emails.
- [ ] It's from **I Travel For Vegan Food** `<hello@itravelforveganfood.com>`, with a subject like
      "Your saved vegan spots in Brisbane and Tokyo".
- [ ] The order is: **Saved guides**, then the **book block**, then places grouped by city.
- [ ] Place and guide names are large, and the links under them are small grey pill buttons.
- [ ] **Google Maps** opens the exact listing. Chains show **Find a location**, which opens a Google Maps search for
      that chain.
- [ ] **Restaurant page** links work. Places saved from a map guide without a restaurant page have **In the guide**,
      which jumps to that place in the guide.
- [ ] A closed restaurant shows its **Permanently Closed** badge.
- [ ] **See the book** opens the Japan book on Gumroad.
- [ ] The small print says it's a one-off email.
- [ ] **Reply** to it: the reply arrives in your personal inbox, through `hello@`.
- [ ] Look at it in Gmail on your phone, and in Apple Mail if you have it.

**Other checks**
- [ ] **Someone else's address:** send a list to a friend (or a second address of yours that isn't set up in
      Cloudflare). It should arrive. If it doesn't, and the Worker's logs mention `E_RECIPIENT_NOT_ALLOWED`, tell me.
- [ ] **Newsletter box ticked** (use a second address): in Kit, that address is a subscriber with the tags
      `Saved list` and one per city, e.g. `Saved: Tokyo`. The email's small print mentions the newsletter.
- [ ] **Sending twice quickly** shows "You just sent a list. Please wait a minute…".
- [ ] **Logs:** Cloudflare's **Compute > Email Service > Email Sending** page lists each email sent, and the Worker's
      **Observability / Logs** tab shows any errors.

---

## Part E: Go live

- [ ] Publish to your domains.
- [ ] Publish your updated Privacy Policy page too.

---

## Changing things later

| To change | Edit | Then |
|---|---|---|
| "From" name or address, reply-to address, logo | `worker/wrangler.jsonc` (`vars`). If you change `FROM_EMAIL`, change `allowed_sender_addresses` too | Push to GitHub |
| Book wording or Gumroad links, destinations | `worker/src/data.js` (add new destinations in `core.js` too) | Push to GitHub |
| Email wording or design | `worker/src/email.js` | Push to GitHub |
| Form wording on the website | `core.js` (search for `EMAIL_MESSAGES` and `Email me my list`) | New release, then update the core line |

**Preview the email:** open `worker/preview/sample-email.html` in your browser. If you change the design and have
Node.js installed, run `node preview/make-preview.js` inside the `worker` folder to refresh it.

---

## Notes

- **Sending from hello@.** Lists come from the same address you use for replies and personal email. That's fine:
  sending reputation belongs to the whole domain either way, and replies land in your inbox as normal.
- **Logo in desktop Outlook.** The logo is a WebP image, which desktop Outlook doesn't display: it shows the text
  "I Travel For Vegan Food" instead. To fix it, upload a PNG version of the logo (about 72×72 pixels) to Webflow's
  Assets, copy its address into `LOGO_URL` in `wrangler.jsonc`, and push.
- **Daily sending allowance.** New Cloudflare accounts start with a small daily allowance, which grows as your
  sending history builds up. If it's ever reached, readers see "We're sending a lot of lists right now. Please try
  again a little later." You can also ask Cloudflare for a higher limit.
- **After the move to Astro.** Add the new site's addresses to `ALLOWED_ORIGINS` (in `wrangler.jsonc`) and to the
  Turnstile widget's hostnames, and point `LOGO_URL` at the logo on the new site.

---

## Troubleshooting

| What the reader sees | Likely cause | What to do |
|---|---|---|
| "Couldn't reach our server" | The Worker isn't deployed, or its address isn't active yet | Open `https://api.itravelforveganfood.com/`: it should show `"ok":true` |
| "We couldn't confirm you're not a robot" every time | `TURNSTILE_SECRET` is missing or wrong, or the site's address isn't in the Turnstile widget's hostnames | Re-add the secret; check the widget's hostnames |
| "Something went wrong on our side" | Look at the Worker's logs. `E_SENDER_NOT_VERIFIED` means Email Sending isn't fully set up for the domain | Check **Email Sending** shows your domain as ready |
| The email doesn't arrive | Spam folder, or a delivery problem | Check the **Email Sending** log for that address |
| Opt-ins don't appear in Kit | `KIT_API_KEY` is missing or wrong | The Worker's logs will show "Kit opt-in failed"; re-add the key |
