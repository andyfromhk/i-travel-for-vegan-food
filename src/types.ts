/** Page metadata for `BaseHead` and layouts. */
export interface SeoProps {
  /** Page title, written in full. Defaults to the site name. */
  title?: string;
  /** Page and social description. Defaults to `SITE_DESCRIPTION`. */
  description?: string;
  /** Social image. Defaults to the square logo. */
  image?: string;
  /** Open Graph type. */
  type?: "website" | "article";
  /** Override `NOINDEX_ROUTES` for this page's robots tag. */
  noindex?: boolean;
  /** Structured data (JSON-LD) describing the page to search engines. */
  schema?: Record<string, unknown> | Record<string, unknown>[];
}
