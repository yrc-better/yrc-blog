import path from "node:path";
import type { Rule } from "eslint";
import { CONTENT_GATEWAYS, REPO_ROOT, importViolation, layerOf, repoRelative } from "../layers.ts";

function sourceOf(node: Rule.Node): string | undefined {
  if (
    (node.type === "ImportDeclaration" || node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") &&
    node.source &&
    typeof node.source.value === "string"
  ) {
    return node.source.value;
  }
  if (node.type === "ImportExpression" && node.source.type === "Literal" && typeof node.source.value === "string") {
    return node.source.value;
  }
  return undefined;
}

export const layerBoundaries: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Enforce the one-way dependency graph between repository layers." },
    schema: [],
    messages: {
      crossing: "{{from}} → {{to}} is not allowed. {{why}}",
      content:
        "'astro:content' may only be imported from src/catalog or src/content.config.ts. Add a query to src/catalog/entries.ts and import that instead.",
      alias: "Use a relative import. Path aliases hide which layer a module belongs to.",
    },
  },
  create(context) {
    const fromRel = repoRelative(context.filename);
    const fromLayer = layerOf(fromRel);
    if (!fromLayer) return {};

    const check = (node: Rule.Node): void => {
      const spec = sourceOf(node);
      if (!spec) return;
      if (spec === "astro:content") {
        if (!CONTENT_GATEWAYS.includes(fromLayer)) context.report({ node, messageId: "content" });
        return;
      }
      if (spec.startsWith("@/") || spec.startsWith("~/")) {
        context.report({ node, messageId: "alias" });
        return;
      }
      if (!spec.startsWith(".")) return;
      const fromDir = path.dirname(path.join(REPO_ROOT, fromRel));
      const toRel = repoRelative(path.resolve(fromDir, spec));
      const toLayer = layerOf(toRel);
      if (!toLayer) return;
      const why = importViolation(fromLayer, toLayer);
      if (why) context.report({ node, messageId: "crossing", data: { from: fromLayer, to: toLayer, why } });
    };

    return {
      ImportDeclaration: check,
      ImportExpression: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};
