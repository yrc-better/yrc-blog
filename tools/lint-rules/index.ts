import type { ESLint } from "eslint";
import { layerBoundaries } from "./rules/layer-boundaries.ts";
import { noComments } from "./rules/no-comments.ts";
import { noRawTimers } from "./rules/no-raw-timers.ts";
import { browserGlobalsInClientFiles } from "./rules/browser-globals-in-client-files.ts";
import { noRootRelativeUrl } from "./rules/no-root-relative-url.ts";
import { noHtmlInjection } from "./rules/no-html-injection.ts";

export const rules = {
  "layer-boundaries": layerBoundaries,
  "no-comments": noComments,
  "no-raw-timers": noRawTimers,
  "browser-globals-in-client-files": browserGlobalsInClientFiles,
  "no-root-relative-url": noRootRelativeUrl,
  "no-html-injection": noHtmlInjection,
};

const plugin: ESLint.Plugin = {
  meta: { name: "synn", version: "1.0.0" },
  rules,
};

export default plugin;
