import type { Rule } from "eslint";

const URL_ATTRIBUTES = new Set(["href", "src", "action", "srcset", "poster"]);

type AttributeNode = {
  type: "JSXAttribute";
  name: { type: string; name?: unknown };
  value: { type: string; value?: unknown } | null;
};

export const noRootRelativeUrl: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Internal URLs must go through route()/asset() so the GitHub Pages base path is applied." },
    schema: [],
    messages: {
      banned:
        "'{{value}}' ignores the '/yrc-blog' base path and will 404 on GitHub Pages. Use route(...) or asset(...) from src/shared/url.ts.",
    },
  },
  create(context) {
    return {
      JSXAttribute(raw: unknown) {
        const node = raw as AttributeNode;
        const name = node.name.name;
        if (typeof name !== "string" || !URL_ATTRIBUTES.has(name)) return;
        const value = node.value?.type === "Literal" ? node.value.value : undefined;
        if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
          context.report({ node: raw as Rule.Node, messageId: "banned", data: { value } });
        }
      },
    } as Rule.RuleListener;
  },
};
