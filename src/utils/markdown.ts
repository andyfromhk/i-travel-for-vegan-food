// Renders a piece of Markdown that lives in a content file's front matter (rather than its body)
// with the same plugins as everything else: shortcodes, photos, tips and links.

import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { remarkShortcodes } from "@/markdown/shortcodes.ts";
import { rehypeEnhance } from "@/markdown/enhance.ts";

let processor: ReturnType<typeof createMarkdownProcessor> | undefined;

export async function renderMarkdown(markdown?: string): Promise<string> {
  if (!markdown?.trim()) return "";
  processor ??= createMarkdownProcessor({
    smartypants: false,
    remarkPlugins: [remarkShortcodes],
    rehypePlugins: [rehypeEnhance],
  });
  const { code } = await (await processor).render(markdown);
  return code;
}
