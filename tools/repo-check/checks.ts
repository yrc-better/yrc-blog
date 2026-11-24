import { existsSync } from "node:fs";
import path from "node:path";
import { FEATURES } from "../../verification/feature-map.ts";
import { REPO_ROOT, blocks, lineAt, read, trackedFiles, workingFiles } from "./files.ts";

export type Problem = { file: string; line?: number; detail?: string | undefined };

export type Check = {
  id: string;
  why: string;
  fix: string;
  run: (files: string[]) => Problem[];
};

const TOKENS_FILE = "src/styles/tokens.css";
const ALLOWED_MARKDOWN = new Set(["README.md", "AGENTS.md"]);
const COLLECTIONS = ["papers", "posts", "projects"];
const SLUG = "[a-z0-9\\p{Script=Han}]+(?:-[a-z0-9\\p{Script=Han}]+)*";
const CONTENT_FILE = new RegExp(
  `^src/content/(${COLLECTIONS.join("|")})/${SLUG}/(index\\.md|images/[^/]+\\.(png|jpe?g|webp|gif|svg))$`,
  "u",
);
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(|:\s*(?:white|black|red|blue|green|yellow|orange|purple|pink|gray|grey|transparent)\b/;
const CLIENT_IMPORT = /^\s*import\s+["'](\.{1,2}\/[^"']+\.client\.ts)["'];?\s*$/;
const MAX_PAGE_LINES = 40;

function cssSources(files: string[]): { file: string; css: string; offset: number }[] {
  const out: { file: string; css: string; offset: number }[] = [];
  for (const file of files) {
    if (file.endsWith(".css")) out.push({ file, css: read(file), offset: 1 });
    if (file.endsWith(".astro")) {
      for (const block of blocks(read(file), "style")) out.push({ file, css: block.body, offset: block.line });
    }
  }
  return out;
}

function scan(source: string, pattern: RegExp): { line: number; text: string }[] {
  const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  return Array.from(source.matchAll(global), (match) => ({ line: lineAt(source, match.index), text: match[0] }));
}

export const CHECKS: Check[] = [
  {
    id: "no-tracked-artifacts",
    why: "Dependencies and build output in git bloat the repo and drift from the lockfile.",
    fix: "Run `git rm -r --cached <path>` and make sure the path is listed in .gitignore.",
    run: () =>
      trackedFiles()
        .filter((file) => /^(node_modules|dist|\.astro|proof|site|\.venv)\//.test(file))
        .map((file) => ({ file })),
  },
  {
    id: "markdown-allowlist",
    why: "Unrequested Markdown goes stale and becomes a place to justify workarounds or over-fit one-off corrections.",
    fix: "Content belongs in src/content/<collection>/<slug>/index.md. A durable rule belongs in tools/lint-rules or tools/repo-check. Only README.md and AGENTS.md may exist as prose.",
    run: (files) =>
      files
        .filter((file) => /\.(md|mdx|markdown)$/i.test(file))
        .filter((file) => !ALLOWED_MARKDOWN.has(file) && !CONTENT_FILE.test(file))
        .map((file) => ({ file })),
  },
  {
    id: "content-layout",
    why: "One folder per entry keeps an entry's text and images together, and the folder name is the URL slug.",
    fix: "Use src/content/<papers|posts|projects>/<slug>/index.md, with images in <slug>/images/. Slugs use lowercase a-z, 0-9, Chinese characters and single hyphens.",
    run: (files) => files.filter((file) => file.startsWith("src/content/") && !CONTENT_FILE.test(file)).map((file) => ({ file })),
  },
  {
    id: "color-tokens",
    why: "Every hard-coded color is a fork of the palette; the next author will copy it.",
    fix: `Add or reuse a --cy-* custom property in ${TOKENS_FILE} and reference it with var(--cy-...).`,
    run: (files) =>
      cssSources(files.filter((file) => file.startsWith("src/") && file !== TOKENS_FILE)).flatMap(({ file, css, offset }) =>
        scan(css, COLOR_LITERAL).map((hit) => ({ file, line: offset + hit.line - 1, detail: hit.text })),
      ),
  },
  {
    id: "no-markup-comments",
    why: "Comments rot, cannot be enforced, and become escape hatches. ESLint covers TS; this covers HTML and CSS.",
    fix: "Delete the comment. Use clearer class or component names, or encode the intent as a check.",
    run: (files) =>
      files
        .filter((file) => file.startsWith("src/") && /\.(astro|css)$/.test(file))
        .flatMap((file) => {
          const source = read(file);
          const pattern = file.endsWith(".astro") ? /<!--|\/\*/ : /\/\*/;
          return scan(source, pattern).map((hit) => ({ file, line: hit.line }));
        }),
  },
  {
    id: "script-blocks-import-only",
    why: "Inline script logic dodges type-checking and lint rules, and it runs before anything else on the page.",
    fix: 'Put the code in a sibling *.client.ts file and write <script>import "./name.client.ts";</script>. Never use is:inline or set:html.',
    run: (files) =>
      files
        .filter((file) => file.startsWith("src/") && file.endsWith(".astro"))
        .flatMap((file) => {
          const source = read(file);
          const problems: Problem[] = blocks(source, "script").flatMap((block) => {
            const lines = block.body.split("\n").filter((line) => line.trim() !== "");
            const ok = block.attrs === "" && lines.length > 0 && lines.every((line) => CLIENT_IMPORT.test(line));
            return ok ? [] : [{ file, line: block.line, detail: block.attrs || lines[0]?.trim() }];
          });
          for (const hit of scan(source, /\b(?:is:inline|set:html)\b/)) problems.push({ file, line: hit.line, detail: hit.text });
          return problems;
        }),
  },
  {
    id: "client-files-are-used",
    why: "An orphan *.client.ts file is dead code that agents will copy.",
    fix: "Import it from a component's <script> block or from another client file, or delete it.",
    run: (files) => {
      const sources = files.filter((file) => /\.(astro|ts)$/.test(file) && file.startsWith("src/")).map((file) => ({ file, text: read(file) }));
      return files
        .filter((file) => file.endsWith(".client.ts"))
        .filter((client) => {
          const base = path.posix.basename(client);
          return !sources.some(({ file, text }) => file !== client && text.includes(`/${base}"`));
        })
        .map((file) => ({ file }));
    },
  },
  {
    id: "pages-are-thin",
    why: "Routes should only compose. Markup and styles in pages escape the feature folders and their lint boundaries.",
    fix: `Move markup, classes and <style> into src/features/<name>/ and render that component. Keep pages under ${MAX_PAGE_LINES} lines.`,
    run: (files) =>
      files
        .filter((file) => file.startsWith("src/pages/"))
        .flatMap((file) => {
          const source = read(file);
          const problems: Problem[] = [];
          if (!file.endsWith(".astro")) problems.push({ file, detail: "only .astro routes are allowed" });
          if (source.split("\n").length > MAX_PAGE_LINES) problems.push({ file, detail: `more than ${MAX_PAGE_LINES} lines` });
          for (const hit of scan(source, /<style\b|\bclass(?::list)?=/)) problems.push({ file, line: hit.line, detail: hit.text });
          return problems;
        }),
  },
  {
    id: "features-are-routed",
    why: "A feature folder that no route renders is unreachable code.",
    fix: "Render the feature from a file in src/pages/, or delete the folder.",
    run: (files) => {
      const pages = files.filter((file) => file.startsWith("src/pages/")).map(read).join("\n");
      const features = new Set(files.map((file) => /^src\/features\/([^/]+)\//.exec(file)?.[1]).filter((name): name is string => Boolean(name)));
      return [...features].filter((name) => !pages.includes(`/features/${name}/`)).map((name) => ({ file: `src/features/${name}/` }));
    },
  },
  {
    id: "buttons-have-labels",
    why: "Buttons decorated with icons and <kbd> hints get unstable accessible names, and an empty name when text is hidden on mobile. Verification found this once; it must not come back.",
    fix: 'Give every <button> an explicit aria-label="…", and describe shortcuts with aria-keyshortcuts.',
    run: (files) =>
      files
        .filter((file) => file.startsWith("src/") && file.endsWith(".astro"))
        .flatMap((file) =>
          scan(read(file), /<button\b[^>]*>/).filter((hit) => !/\saria-label=/.test(hit.text)).map((hit) => ({ file, line: hit.line })),
        ),
  },
  {
    id: "katex-css-matches-renderer",
    why: "rehype-katex renders HTML with its own KaTeX version. If the stylesheet in src/styles comes from another version, sub/superscripts collide (verification caught this once).",
    fix: "Pin the root `katex` dependency to the exact version rehype-katex depends on (`npm ls katex`), so npm dedupes to a single copy.",
    run: () => {
      const nested = ["node_modules/rehype-katex/node_modules/katex/package.json"].filter((file) => existsSync(path.join(REPO_ROOT, file)));
      return nested.map((file) => ({ file, detail: `nested katex ${JSON.parse(read(file)).version} differs from root` }));
    },
  },
  {
    id: "feature-map-coverage",
    why: "Verification only runs what the feature map lists. A route missing from the map ships unverified.",
    fix: "Add an entry to verification/feature-map.ts: what the feature is, how users reach it, and what proves it works.",
    run: (files) => {
      const mapped = new Set(FEATURES.map((feature) => feature.page));
      const missing = files.filter((file) => file.startsWith("src/pages/") && !mapped.has(file)).map((file) => ({ file }));
      const stale = FEATURES.filter((feature) => !existsSync(path.join(REPO_ROOT, feature.page))).map((feature) => ({
        file: "verification/feature-map.ts",
        detail: `${feature.id} points at missing ${feature.page}`,
      }));
      return [...missing, ...stale];
    },
  },
];

export function runChecks(): { check: Check; problems: Problem[] }[] {
  const files = workingFiles();
  return CHECKS.map((check) => ({ check, problems: check.run(files) }));
}
