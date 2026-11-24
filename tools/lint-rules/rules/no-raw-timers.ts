import type { Rule } from "eslint";
import { repoRelative } from "../layers.ts";

const TIMERS = new Set(["setTimeout", "setInterval", "requestAnimationFrame", "requestIdleCallback"]);
const GLOBAL_OBJECTS = new Set(["window", "globalThis", "self"]);
const MOTION_DIR = "src/primitives/motion/";

export const noRawTimers: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "Timers are only allowed inside src/primitives/motion." },
    schema: [],
    messages: {
      banned:
        "Raw {{name}} is banned outside src/primitives/motion/. A timer is usually a patch over a missing event or state model, and copied timers multiply (the 183-timer incident). React to a real event (scroll, transitionend, IntersectionObserver, input) or use every()/typeOut() from src/primitives/motion/schedule.client.ts.",
    },
  },
  create(context) {
    if (repoRelative(context.filename).startsWith(MOTION_DIR)) return {};
    return {
      CallExpression(node) {
        const callee = node.callee;
        let name: string | undefined;
        if (callee.type === "Identifier") name = callee.name;
        if (
          callee.type === "MemberExpression" &&
          callee.object.type === "Identifier" &&
          GLOBAL_OBJECTS.has(callee.object.name) &&
          callee.property.type === "Identifier"
        ) {
          name = callee.property.name;
        }
        if (name && TIMERS.has(name)) context.report({ node, messageId: "banned", data: { name } });
      },
    };
  },
};
