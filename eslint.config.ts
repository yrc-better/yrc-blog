import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import synn, { rules } from "./tools/lint-rules/index.ts";

const synnRules = Object.fromEntries(Object.keys(rules).map((name) => [`synn/${name}`, "error" as const]));

export default defineConfig(
  { ignores: ["dist/", ".astro/", "node_modules/", "proof/", "public/"] },
  tseslint.configs.strict,
  astro.configs.recommended,
  {
    plugins: { synn },
    linterOptions: { noInlineConfig: true },
    rules: {
      ...synnRules,
      "no-console": ["error", { allow: ["error"] }],
      eqeqeq: "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["tools/**/*.ts"],
    rules: { "no-console": "off" },
  },
);
