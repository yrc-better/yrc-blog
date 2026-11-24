import type { Rule, Scope } from "eslint";
import { repoRelative } from "../layers.ts";

const BROWSER_GLOBALS = new Set([
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "navigator",
  "location",
  "history",
  "matchMedia",
  "IntersectionObserver",
  "ResizeObserver",
  "MutationObserver",
]);

type TypedReference = Scope.Reference & { isValueReference?: boolean };

export const browserGlobalsInClientFiles: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Browser globals may only be used in *.client.ts files." },
    schema: [],
    messages: {
      banned:
        "'{{name}}' only exists in the browser, but {{file}} runs at build time. Move this logic into a sibling '*.client.ts' file and load it from the component with <script>import \"./name.client.ts\";</script>.",
    },
  },
  create(context) {
    const rel = repoRelative(context.filename);
    if (!rel.startsWith("src/") || rel.endsWith(".client.ts")) return {};
    return {
      "Program:exit"(node) {
        const scope = context.sourceCode.getScope(node);
        for (const ref of scope.through as TypedReference[]) {
          const name = ref.identifier.name;
          if (!BROWSER_GLOBALS.has(name) || ref.isValueReference === false) continue;
          context.report({ node: ref.identifier, messageId: "banned", data: { name, file: rel } });
        }
      },
    };
  },
};
