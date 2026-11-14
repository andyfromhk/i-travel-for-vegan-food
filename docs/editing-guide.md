# Editing guide: updating the site with Pages CMS

[Pages CMS](https://pagescms.org) gives the site's content an editing screen, with forms for restaurants,
guides and destinations. It doesn't store anything itself. Every time you click **Save**, it writes the change
into the GitHub repository (`andyfromhk/i-travel-for-vegan-food`). Cloudflare sees the change, rebuilds the
site and publishes it, usually within two minutes. Pages CMS is free and open source.

For how to format guides (tip boxes, captions, map guide stops), see [writing-guide.md](writing-guide.md).

## Before launch

Until the domain moves, the live site is still Webflow. The new site only shows on the preview address.

- **Pages CMS edits the branch Cloudflare builds from.** Before launch that's `astro-migration`, so whatever you
  save shows on the preview address. After launch it will be `main`, and a save goes straight to the live site.
- **Try things out freely on the preview.** It's a good way to learn the forms.
- **Real content changes:** keep making them in Webflow until launch, and keep a list. Just before launch, the
  conversion is run again from Webflow so the new site starts with everything up to date. (The converter
  reproduces every fix made since, so nothing is lost.)
- If a developer is also working on the site, tell them when you've saved something, so they pull your changes
  before pushing theirs.

## Setting up (once)

1. Go to [app.pagescms.org](https://app.pagescms.org) and click **Sign in with GitHub**. Use the GitHub account
   that owns the repository.
2. Pages CMS asks you to install its GitHub app. Choose **Only select repositories**, pick
   `i-travel-for-vegan-food`, and install it.
3. Back in Pages CMS, open `andyfromhk/i-travel-for-vegan-food`.
4. Check the branch name at the top left: `astro-migration` before launch, `main` after.

You'll see these sections in the sidebar:

| Section | What's in it | Address on the site |
|---|---|---|
| Restaurants | Every restaurant, plus map guide stops that have no page | /restaurants/… |
| Vegan Foodie Guides | Foodie guides | /articles/… |
| Map Guides & Itineraries | Map guides | /map-guides/… |
| Destinations | Cities and regions | /destinations/… |
| Authors | Guest authors (and the site itself) | /authors/… |
| Pages | About and Privacy Policy | /about, /privacy-policy |
| Book promos | The book box on destination and restaurant pages, and the pop-up in guides | |
| Shop page | Reviews and books on /shop | /shop |
| Media | All photos | |

To give someone else access (a guest writer, a VA), use **Collaborators** in the Pages CMS sidebar. They sign
in with their email address and don't need a GitHub account.

## Everyday tasks

### Add a restaurant

1. **Restaurants → Add an entry.**
2. **File name.** Pages CMS suggests one from the name. It becomes the page address, so check it reads well:
   lowercase, hyphens, and add the city if the name is common (`lord-of-the-fries-melbourne`). You can't
   change it later.
3. Fill in the fields. Each one has a short explanation under it. The ones that matter most:
   - **Destination**: which destination's list and map it appears on.
   - **Summary**: one or two sentences. They show on cards, at the top of the review and in Google results.
   - **Veg type, price range, venue type, cuisine**: these drive the filters and the coloured map pins.
   - **Map pin**: right-click the place in Google Maps; the first line of the menu is its coordinates. Click it
     to copy them, then paste the first number into Latitude and the second into Longitude.
   - **Main photo**, **Food & drink photos**, **Menu & vibe photos**: see [Photos](#photos) below.
4. Write the review in **Review**.
5. Click **Save**. The page appears at `/restaurants/your-file-name` after the next build.

A restaurant shows on its destination's list and map when it has a destination, isn't a draft, and isn't
permanently closed.

### Mark a restaurant closed

Set **Status** to *Temporarily closed* or *Permanently closed*, and change **Last updated**. A permanently closed
restaurant leaves its destination's list and map, keeps its page (so links to it still work), and the page says
it has closed. Prefer this to deleting it: a deleted restaurant's address stops working, and any guide that
mentions it with `{{place: …}}` stops the site from building until it's removed there too.

### Update a guide

Open it, make your changes and set **Last updated** to today. That date shows at the top of the guide, and lists
put the most recently updated guides first.

The first time you save one of the older guides, Pages CMS tidies its Markdown in small ways: `&` becomes
`&amp;`, and line breaks become two spaces at the end of a line. That's expected; the page looks the same.

### Write a new foodie guide

1. **Vegan Foodie Guides → Add an entry.** Check the file name, as for restaurants: it becomes `/articles/…`.
2. Fill in **Title**, **Description** (about 150 characters; Google shows it) and **Category**.
3. **Main destination** is the destination the guide is mainly about. **Also show it on** lists every destination
   page the guide should appear on, including the main one.
4. Switch on **Main guide for its destination** only for the one guide that should lead that destination's list.
5. Switch on **Show the restaurant map banner** to add a link to the destination's restaurant map.
6. Write the guide in **Guide**. The editor has buttons for headings, bold, links, lists, quotes and photos.
   To see or paste raw Markdown, use the **Source** switch above the editor.
7. Save. Leave **Draft** on while you're still writing: drafts don't appear anywhere on the site.

New guides appear on /articles, on the destination pages you chose, on the home page and under related
restaurants.

### Write a map guide

As for a foodie guide, in **Map Guides & Itineraries**. Each stop is a heading followed by a `{{place: …}}` line,
and itineraries can add `{{route: …}}` and `{{end-of-day: …}}` lines. [writing-guide.md](writing-guide.md) has
the details. Type them straight into the editor; there's no need to switch to Source.

If a `{{place: …}}` line names a restaurant that doesn't exist, the build stops and says which names are close
(see [When a save doesn't appear](#when-a-save-doesnt-appear)).

### Add a destination

1. **Destinations → Add an entry.**
2. **Slug**: the page address (`/destinations/slug`), in lowercase with hyphens, e.g. `hong-kong`. It also
   becomes the file name. Set it once; it can't be changed later.
3. **Country** must already exist. A new country also needs its currency and phrase card, so that's a job for a
   developer (`src/data/countries.json`).
4. **Position in the menu** orders the Destinations page and the menu. **Position on the home page** puts it on
   the home page; leave it empty to keep it off.
5. Add a **Card photo** and, if it has a restaurant map, a **Map banner graphic**.

The menu, the Destinations page and the filters pick up the new destination by themselves. The map icon appears
next to it in the menu once one of its restaurants has a map pin.

### Guest posts

Add the guest writer in **Authors** first (with a slug, e.g. `anita-dollar`), then choose them as **Guest
author** on their guide. Leave Guest author empty on your own guides. The guest post guidelines live in the
Google Doc linked from the About page.

### Book promos and the shop

- **Book promos** holds one entry per book. The box on destination and restaurant pages appears when the
  destination's country names a book (Japan, Thailand, Hong Kong, Taiwan).
- **Shop page** holds the reader reviews (each with the reviewer's name, shown under the quote) and the books on
  /shop. Wrap words in `**double asterisks**` to make them bold in a review.

### Recommendations for Your … Trip

The box on guides and map guides takes its links from the destination (**Destinations** → **Recommendations for
your trip**): where to stay, getting around, eSIM and an experience. The Travel Insurance link is the same for every
destination, so it lives in the code (`TRAVEL_INSURANCE_URL` in `src/consts.ts`); changing it is a developer job.

### The sign-up form and cheat sheets

On Japan, Thailand, Taiwan and Hong Kong pages the sign-up form offers that country's free cheat sheet, which the
email Worker sends. Its restaurants, guides and phrases come from the site, so edits you make here reach it the
next time a developer runs `worker/scripts/build-cheat-sheets.mjs` (see `email-checklist.md`).

## Photos

- **Keep each photo under about 100 KB.** Resize to 1,200–1,600 pixels wide and save as WebP. The free
  [Squoosh](https://squoosh.app) does both in the browser: drop the photo in, choose WebP, set the width under
  *Resize*, and aim for 70–80 quality.
- **Name files before uploading**, e.g. `vega-cafe-brisbane-burger.webp`. Pages CMS turns spaces and capitals
  into hyphens.
- **Keep the folders tidy.** Each restaurant and guide has its own folder (`restaurants/vega-cafe/`,
  `guides/vegan-tokyo-guide/`). In the photo picker, open or create the right folder before uploading.
- **Always fill in the description.** It's read aloud to people who can't see the photo, and Google uses it.
- **Captions in guides:** an italic line directly under a photo becomes its caption.
- **Removing a photo from an entry doesn't delete the file.** Only delete files in Media when nothing uses them.

## When a save doesn't appear

Each save starts a new build, which usually takes one to two minutes. If the change still hasn't appeared after
five minutes, the build probably stopped because something in the content needs fixing. **The site keeps showing
the last good version while that's the case**, so nothing breaks for readers.

To see why:

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **itfvf-site** →
   **Deployments**, and click **View build history** at the bottom.
2. Open the failed build and scroll to the red lines near the end of the log.

The site checks the content on every build and explains problems in plain words:

| Message | What to do |
|---|---|
| `Unknown place "vega-caffe" in {{place: …}} … Did you mean: vega-cafe?` | Fix the name in that guide's `{{place: …}}` line. |
| `places/x.md: destination "y" doesn't exist.` | Choose an existing destination on that restaurant. |
| `destinations/x.md: slug "y" must match the file name "x".` | Change the slug back to the file name. |
| `… Use lowercase letters, numbers and single hyphens` | Fix the slug's spelling. |

Fix it in Pages CMS and save again. The next build publishes everything saved in between.

## Things that need a developer

- A new country, cuisine, venue type, veg type or guide category. (They live in `src/data/countries.json` and
  `src/data/taxonomies.json`, and the matching drop-down in `.pages.yml` needs the same entry.)
- Renaming a page that's already published: the old address needs a redirect.
- A new tip box icon (see the end of [writing-guide.md](writing-guide.md)).
- Shrinking photos that were uploaded too large: `node migration/scripts/compress-media.mjs` shrinks every
  photo over 200 KB in place, keeping its name.
- Changes to page layouts, the menu or the footer.
