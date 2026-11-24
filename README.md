# synn's space

A personal blog (papers, projects, posts), built with Astro and TypeScript and deployed to https://yrc-better.github.io/yrc-blog/.

```bash
npm install
npm run dev        # http://localhost:4321/yrc-blog/
npm run ci         # check → build → verify → fuzz (same as CI)
```

## Writing

Each entry is a folder: `src/content/<papers|posts|projects>/<slug>/index.md`. Images go in `<slug>/images/` and are referenced as `./images/x.png`. The folder name is the URL. Frontmatter is validated by `src/content.config.ts`, so a missing or wrong field fails the build with a clear message.

## Layout

| Path | Role | May import |
| --- | --- | --- |
| `src/shared/` | constants, URL and date helpers | nothing above it |
| `src/primitives/` | generic UI (HUD panel, glitch text, buttons) + `motion/` (the only place timers are allowed) | shared |
| `src/catalog/` | the only gateway to `astro:content` | shared |
| `src/shell/` | layout, header, footer, command palette | primitives, catalog, shared |
| `src/features/<name>/` | one folder per feature: markup, styles, `*.client.ts` | shell, primitives, catalog, shared, its own folder |
| `src/pages/` | thin routes that render one feature | features, catalog, shared |
| `verification/` | feature map: what exists, how users reach it, what proves it works | nothing |
| `tools/` | lint rules, repo checks, verification CLI | verification, shared |

## Guardrails

- `npm run lint`: custom ESLint rules in `tools/lint-rules/` (layer boundaries, no comments, no raw timers, browser globals only in `*.client.ts`, no root-relative URLs, no `innerHTML`). `rules.test.ts` covers them.
- `npm run repo-check`: repository invariants (no tracked build output, Markdown allowlist, content layout, colors only in `tokens.css`, script blocks import-only, thin pages, labelled buttons, KaTeX version pinned, every route in the feature map).
- `npm run verify`: drives Chrome through every feature at desktop and mobile sizes. It checks the proofs, console errors, overflow and links, and writes screenshots to `proof/index.html`.
- `npm run fuzz`: seeded random user walks (links, palette queries, resize, back) that check global invariants. Replay a failure with `--seed`.
- `npm run site -- snapshot|screenshot|click …`: inspect a built page the way a user would.
