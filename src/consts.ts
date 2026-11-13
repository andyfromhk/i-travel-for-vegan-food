/** Site name. Used as `og:site_name` and wherever the brand is written out. */
export const SITE_NAME = "I Travel For Vegan Food";
/** Fallback meta description for pages that don't set their own. */
export const SITE_DESCRIPTION =
  "If you are like me, food is what motivates you to travel around the world. Read our food guides to find the best vegan eats around the world.";
/** Canonical origin. Resolves canonical URLs, social images, and the sitemap. */
export const SITE_URL = "https://www.itravelforveganfood.com";
/** BCP 47 locale tag used to format dates and numbers. */
export const SITE_LOCALE = "en-AU";
/** Routes excluded from search and the sitemap. Surrounding slashes are ignored. */
export const NOINDEX_ROUTES: string[] = ["/404"];

/** Square logo used in structured data (JSON-LD) and by the saved-places scripts. */
export const SITE_LOGO = "/site/brand/logo.webp";

/** Social profiles shown in the footer and on the About page. */
export const SOCIAL = {
  instagram: "https://www.instagram.com/itravelforveganfood/",
  pinterest: "https://www.pinterest.com/itravelforveganfood/",
};

/** Where the vegan travel books are sold. */
export const SHOP_URL = "/shop";

/**
 * Google Maps. The key is restricted to this site's addresses in the Google Cloud console,
 * which is what keeps it safe to publish. The Map ID carries the map's colours.
 */
export const GOOGLE_MAPS = {
  key: "AIzaSyCUbR04ahKoF2uAcAEhAr7gkTAOkbgVUPE",
  mapId: "7ffd42eb279d407c",
};

/** "Email me my list": the Worker in /worker and its bot check (Cloudflare Turnstile). */
export const EMAIL_LIST = {
  endpoint: "https://api.itravelforveganfood.com/email-list",
  subscribeEndpoint: "https://api.itravelforveganfood.com/subscribe",
  turnstileSiteKey: "0x4AAAAAAFKLtViiyoSQMH3g",
};

/** Contact form (About page). Web3Forms access keys are public by design: they only allow sending to the owner's inbox. */
export const WEB3FORMS_KEY = "e182c223-205a-4d03-b274-74e7ec2a1b6c";

/** Google Analytics 4 measurement ID. Leave empty to switch Google Analytics off. */
export const GA_MEASUREMENT_ID = "G-4E3VDR5QL6";

/** Guest post guidelines linked from the About page. */
export const GUEST_POST_GUIDELINES =
  "https://docs.google.com/document/d/10IJDTS6zt22kpI_k4fl54ZVn4BbPpwux99gynhPvgls/edit?usp=sharing";
