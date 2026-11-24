import { test } from "node:test";
import assert from "node:assert/strict";
import { ESLint } from "eslint";
import { REPO_ROOT } from "./layers.ts";

const eslint = new ESLint({ cwd: REPO_ROOT });

async function rulesFired(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((message) => message.ruleId ?? "fatal").filter((id) => id.startsWith("synn/") || id === "fatal");
}

const VIOLATIONS: { name: string; file: string; code: string; rule: string }[] = [
  { name: "feature imports another feature", file: "src/features/a/A.astro", code: '---\nimport B from "../b/B.astro";\n---\n<B />', rule: "synn/layer-boundaries" },
  { name: "primitive imports catalog", file: "src/primitives/X.astro", code: '---\nimport { listPosts } from "../catalog/entries.ts";\nawait listPosts();\n---', rule: "synn/layer-boundaries" },
  { name: "shell imports a feature", file: "src/shell/X.astro", code: '---\nimport H from "../features/home/HomePage.astro";\n---\n<H />', rule: "synn/layer-boundaries" },
  { name: "page imports a primitive", file: "src/pages/x.astro", code: '---\nimport C from "../primitives/Chip.astro";\n---\n<C />', rule: "synn/layer-boundaries" },
  { name: "feature reads astro:content", file: "src/features/a/a.ts", code: 'import { getCollection } from "astro:content";\nexport const all = getCollection("posts");\n', rule: "synn/layer-boundaries" },
  { name: "shared imports up", file: "src/shared/x.ts", code: 'import { route } from "../catalog/entries.ts";\nexport const r = route;\n', rule: "synn/layer-boundaries" },
  { name: "tools import src beyond shared", file: "tools/x.ts", code: 'import { listPosts } from "../src/catalog/entries.ts";\nexport const s = listPosts;\n', rule: "synn/layer-boundaries" },
  { name: "line comment", file: "src/shared/x.ts", code: "// explain\nexport const a = 1;\n", rule: "synn/no-comments" },
  { name: "block comment", file: "tools/x.ts", code: "/* explain */\nexport const a = 1;\n", rule: "synn/no-comments" },
  { name: "setTimeout in feature", file: "src/features/a/a.client.ts", code: "setTimeout(() => undefined, 0);\n", rule: "synn/no-raw-timers" },
  { name: "window.setInterval in shell", file: "src/shell/s.client.ts", code: "window.setInterval(() => undefined, 9);\n", rule: "synn/no-raw-timers" },
  { name: "document in build-time ts", file: "src/catalog/x.ts", code: "export const t = document.title;\n", rule: "synn/browser-globals-in-client-files" },
  { name: "window in astro frontmatter", file: "src/features/a/A.astro", code: "---\nconst w = window.innerWidth;\n---\n<p>{w}</p>", rule: "synn/browser-globals-in-client-files" },
  { name: "root-relative href", file: "src/features/a/A.astro", code: '<a href="/papers/">x</a>', rule: "synn/no-root-relative-url" },
  { name: "innerHTML", file: "src/features/a/a.client.ts", code: 'document.body.innerHTML = "<b>x</b>";\n', rule: "synn/no-html-injection" },
];

const ALLOWED: { name: string; file: string; code: string }[] = [
  { name: "feature imports own file, primitive, catalog", file: "src/features/home/X.astro", code: '---\nimport H from "./HomeHero.astro";\nimport C from "../../primitives/Chip.astro";\nimport { listFeed } from "../../catalog/entries.ts";\nconst f = await listFeed();\n---\n<C>{f.length}</C><H counts={{ paper: 1, post: 1, project: 1 }} />' },
  { name: "timer inside motion primitive", file: "src/primitives/motion/x.client.ts", code: "export const h = window.setInterval(() => undefined, 9);\n" },
  { name: "document in client file", file: "src/features/a/a.client.ts", code: "export const t = document.title;\n" },
  { name: "type-only DOM reference at build time", file: "src/shared/x.ts", code: "export type E = HTMLElement;\nexport const n = 1;\n" },
  { name: "external and fragment hrefs", file: "src/features/a/A.astro", code: '<a href="https://x.dev">x</a><a href="#top">t</a><a href="//cdn.dev/a.js">c</a>' },
  { name: "tools import verification", file: "tools/x.ts", code: 'import { FEATURES } from "../verification/feature-map.ts";\nexport const f = FEATURES;\n' },
];

for (const c of VIOLATIONS) {
  test(`flags: ${c.name}`, async () => {
    const fired = await rulesFired(c.file, c.code);
    assert.ok(fired.includes(c.rule), `expected ${c.rule}, got [${fired.join(", ")}]`);
  });
}

for (const c of ALLOWED) {
  test(`allows: ${c.name}`, async () => {
    assert.deepEqual(await rulesFired(c.file, c.code), []);
  });
}
