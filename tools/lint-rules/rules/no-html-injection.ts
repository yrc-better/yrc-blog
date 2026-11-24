import type { Rule } from "eslint";

const SINKS = new Set(["innerHTML", "outerHTML"]);

export const noHtmlInjection: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Ban innerHTML/outerHTML/insertAdjacentHTML." },
    schema: [],
    messages: {
      banned:
        "{{name}} parses strings as HTML: an XSS risk that needs case-by-case judgement. Render markup in the .astro template and toggle it with attributes (hidden, aria-*), or set textContent.",
    },
  },
  create(context) {
    return {
      AssignmentExpression(node) {
        const target = node.left;
        if (target.type === "MemberExpression" && target.property.type === "Identifier" && SINKS.has(target.property.name)) {
          context.report({ node, messageId: "banned", data: { name: target.property.name } });
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === "MemberExpression" && callee.property.type === "Identifier" && callee.property.name === "insertAdjacentHTML") {
          context.report({ node, messageId: "banned", data: { name: "insertAdjacentHTML" } });
        }
      },
    };
  },
};
