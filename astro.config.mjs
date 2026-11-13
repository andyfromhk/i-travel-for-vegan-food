// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import { SITE_URL } from "./src/consts.ts";
import { remarkShortcodes } from "./src/markdown/shortcodes.ts";
import { rehypeEnhance } from "./src/markdown/enhance.ts";

export default defineConfig({
  site: SITE_URL,
  // URLs have no trailing slash, exactly as they were on Webflow (/articles/vegan-tokyo-guide).
  // "file" writes about.html rather than about/index.html, which is what lets Cloudflare serve
  // /about directly instead of redirecting to /about/.
  trailingSlash: "never",
  build: { format: "file" },
  markdown: {
    // The Unified processor runs the two plugins in src/markdown (shortcodes, photos, tips, heading ids).
    processor: unified({
      // Keeps quotes and dashes exactly as written instead of restyling them.
      smartypants: false,
      remarkPlugins: [remarkShortcodes],
      rehypePlugins: [rehypeEnhance],
    }),
  },
  fonts: [
    {
      name: "Montserrat",
      cssVariable: "--font-montserrat",
      provider: fontProviders.local(),
      options: {
        variants: [
          {
            weight: "100 900",
            style: "normal",
            src: ["./src/assets/fonts/montserrat-latin-wght-normal.woff2"],
          },
          {
            weight: "100 900",
            style: "italic",
            src: ["./src/assets/fonts/montserrat-latin-wght-italic.woff2"],
          },
        ],
      },
    },
  ],
  vite: { build: { cssTarget: "safari15.4" } },
});
