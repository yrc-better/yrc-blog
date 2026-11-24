import type { Rule } from "eslint";

export const noComments: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Ban code comments: they go stale, cannot be enforced, and become escape hatches." },
    schema: [],
    messages: {
      banned:
        "Comments are banned. If it explains intent, rename or extract a function. If it warns the next author, encode it as a rule in tools/lint-rules or a check in tools/repo-check. If it justifies a workaround, fix the root cause instead.",
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.loc) context.report({ loc: comment.loc, messageId: "banned" });
        }
      },
    };
  },
};
