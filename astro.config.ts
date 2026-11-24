import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { SITE } from "./src/shared/site.ts";

export default defineConfig({
  site: SITE.origin,
  base: SITE.basePath,
  trailingSlash: "always",
  build: { format: "directory" },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
    shikiConfig: { themes: { dark: "synthwave-84" }, defaultColor: false, wrap: false },
  },
});
