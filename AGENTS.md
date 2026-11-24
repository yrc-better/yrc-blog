# AGENTS.md

Most rules for this repo are enforced by code, not written here. Run `npm run check`. Every error message explains the rule and how to fix it.

## Judgment calls the checks can't make

- **Voice.** Site chrome is terse English with a terminal/HUD flavor. Posts and paper notes are in the author's own Chinese. Never rewrite content text without being asked.
- **Design.** Cyberpunk: dark background, yellow (`--cy-yellow`) as the main accent, cyan for interaction, magenta for warnings and projects. Use clipped corners and a restrained glitch effect. Effects decorate content; they must never hide it.
- **Scope.** Make the smallest change that solves the task. Don't add pages, dependencies or abstractions that weren't requested.

## When you get corrected

Don't add the lesson to this file. Encode it:

1. Add a rule in `tools/lint-rules/rules/` (with a case in `rules.test.ts`) or a check in `tools/repo-check/checks.ts`. Give it an actionable message.
2. Or remove the problem at its source with a better API in `src/primitives` or `src/catalog`.
3. Clean up existing instances in the same change so the bad pattern can't be copied.

## Before you hand off

`npm run ci` runs check → build → verify → fuzz. Review the screenshots in `proof/index.html`, not just the diff. A new route needs an entry in `verification/feature-map.ts`.
