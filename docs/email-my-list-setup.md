# "Email me my list": setup guide (Cloudflare Email Sending)

This guide covers everything **you** need to set up before the feature is deployed. None of it changes your website.
(It's all done now; the next step is `email-checklist.md`.)

When you're done, send me the items marked **Send to Claude**. Never send me anything marked **Secret**: those go
straight into Cloudflare, and only there.

**Already done:** your domain's DNS is on Cloudflare (moved from GoDaddy, which stays your domain registrar).

---

## How it will work

1. A reader opens their saved list and taps **Email me my list**.
2. They type their email address. There's a separate, unticked checkbox: *"Also send me new guides for these places"*.
3. A quick invisible bot check (Cloudflare Turnstile) makes sure it's a person, not a spam robot.
4. The website sends the list to a small program of yours on Cloudflare (a **Worker**) at
   `api.itravelforveganfood.com`.
5. The Worker builds a nicely designed email (saved guides, a book block, then places grouped by city, with Google
   Maps and restaurant page links) and sends it with **Cloudflare Email Sending**, from `hello@itravelforveganfood.com`.
6. **Only if the checkbox was ticked**, the Worker also adds the reader to Kit and tags them with the places they
   saved (for example `Saved list` and `Saved: Tokyo`), so you can send them the right guides and books later.

Why a Worker in the middle? Adding people to Kit needs a secret key, and anything in your website's code is public.
The Worker is the private place where that key lives.

---

## What it costs

| Service | Cost |
|---|---|
| Cloudflare Workers Paid plan | US$5 a month. It includes 3,000 emails a month; after that, US$0.35 per 1,000 |
| Cloudflare Turnstile | Free |
| Cloudflare Email Routing (Step 3) | Free |
| Kit | Your current plan (people who opt in count as subscribers) |

Two things to know about Cloudflare Email Sending:
- **It's still labelled beta.** It's meant for this kind of one-to-one, requested email (your newsletters stay in
  Kit).
- **New accounts start with a small daily sending allowance, which grows automatically** as your sending history
  builds up. That's plenty for saved lists. If the limit is ever reached, the reader sees a friendly "please try
  again a bit later" message instead of an error.

---

## Step 1: Upgrade to the Workers Paid plan (2 minutes)

1. In Cloudflare, open **Workers & Pages** and find the plans page (usually a **Plans** link or an **Upgrade**
   button on the Workers overview).
2. Choose **Workers Paid** and confirm.

---

## Step 2: Turn on Email Sending for your domain (5 minutes)

1. In Cloudflare, go to **Compute > Email Service > Email Sending**.
2. Select **Onboard Domain** and choose `itravelforveganfood.com`.
3. Cloudflare shows the DNS records it will add. It adds them itself; you don't copy anything:
   - records on a `cf-bounce` subdomain (for bounced emails, and to prove Cloudflare may send for you)
   - a DMARC record on `_dmarc.itravelforveganfood.com`
4. Select **Done**.
5. Check: your domain's **DNS > Records** page should now list the new records. It usually takes 5–15 minutes
   before sending works.

Good to know:
- These records only affect **sending**. Your website isn't touched.
- If Cloudflare says a `_dmarc` record already exists, don't delete anything; tell me and we'll merge them.
- Don't remove these records later, including during the Astro migration. The migration brief says so too.

---

## Step 3: A real address for sending and replies

Your domain had no email inbox (no `MX` record), so you set up `hello@itravelforveganfood.com` with
**Cloudflare Email Routing**, forwarding to your personal inbox:

1. In Cloudflare, go to **Compute > Email Service > Email Routing** (or **Email > Email Routing** in your domain's
   menu) and enable it for `itravelforveganfood.com`.
2. Create a custom address `hello@itravelforveganfood.com`, forwarding to your personal email.
3. Cloudflare sends a verification email to your personal address: click the link in it.
4. Let Cloudflare add the records it asks for. These **do** add MX records to your main domain; that's expected,
   and they only handle incoming mail.
5. Send a test email to `hello@itravelforveganfood.com` from another account and check it arrives.

Lists are sent **from** `hello@itravelforveganfood.com` (name: *I Travel For Vegan Food*), and replies come back to
the same address. Both are set in the Worker's settings file, `worker/wrangler.jsonc`.

---

## Step 4: Kit (10 minutes)

### 4a. Create an API key
1. In Kit, open **Settings > Developer**.
2. Click **Add a new key**, name it `Saved list worker`, and copy the key (a **v4** key) into your password manager.

**Secret:** the Kit API key.

### 4b. Create the opt-in tag
1. In Kit, open your **Subscribers** page and create a tag named `Saved list` (the option to create a tag is on
   that page).
2. Click the tag to filter by it and look at the page address: the number in it is the tag's ID.

**Send to Claude:** the `Saved list` tag ID. (Done: `24152685`.)

The Worker also adds a tag for each city in the reader's list (for example `Saved: Tokyo`), creating each one the
first time it's needed. You don't need to create those yourself.

### 4c. Good to know about consent
People added to Kit this way become subscribers straight away, with no confirmation email. That's why the checkbox
is separate from the list itself and **unticked** by default: people only join your newsletter if they choose to.
Kit's own unsubscribe link then works as usual. (If you'd rather everyone confirm by email first, tell me, and I'll
route opt-ins through a Kit double opt-in form instead.)

### 4d. Optional: a welcome automation
In Kit, you can set up a visual automation (under **Automate** in Kit's menu) with the trigger "Subscriber is added
to tag **Saved list**", followed by a welcome email or a short sequence. For example: a thank-you, your best guides
for their saved cities, and later a mention of the matching book. This is entirely up to you and can be added any
time.

---

## Step 5: Cloudflare Turnstile, the bot check (5 minutes)

Without it, a robot could use your form to send emails to strangers.

1. In Cloudflare, open **Turnstile** (if it isn't in the left menu, type "Turnstile" into the dashboard's search
   box), then **Add widget**.
2. Name: `Saved list email`.
3. Hostnames: `itravelforveganfood.com`, `www.itravelforveganfood.com` and `itravelforveganfood.webflow.io`.
   (During the Astro migration, you'll add the new preview address here too.)
4. Widget mode: **Managed** (most people never see a challenge).
5. Create it. You'll get two keys:
   - **Send to Claude:** the **Site Key**. It's meant to be public: it goes in the website's code. (Done.)
   - **Secret:** the **Secret Key**.

---

## Next

Everything here is done. Deploying and testing are in **`email-checklist.md`**.

## After the move to Astro

Nothing about this feature has to change. The Worker keeps running on its own at `api.itravelforveganfood.com`.
During the migration you'll add the new site's addresses to the Worker's allowed list and to the Turnstile widget.
The Astro site also makes a nice extra possible: a **View all on a map** page for each emailed list.
