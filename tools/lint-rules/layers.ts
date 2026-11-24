import path from "node:path";

export type Layer =
  | "root"
  | "shared"
  | "styles"
  | "primitives"
  | "catalog"
  | "shell"
  | "pages"
  | "content"
  | "content-config"
  | "verification"
  | "tools"
  | `feature:${string}`;

export const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");

export function repoRelative(file: string): string {
  const real = file.replace(/(\.astro)\/[^/]+$/, "$1");
  return path.relative(REPO_ROOT, real).split(path.sep).join("/");
}

export function layerOf(relPath: string): Layer | undefined {
  if (relPath === "src/content.config.ts") return "content-config";
  const feature = /^src\/features\/([^/]+)\//.exec(relPath);
  if (feature?.[1]) return `feature:${feature[1]}`;
  const prefixes: [string, Layer][] = [
    ["src/shared/", "shared"],
    ["src/styles/", "styles"],
    ["src/primitives/", "primitives"],
    ["src/catalog/", "catalog"],
    ["src/shell/", "shell"],
    ["src/pages/", "pages"],
    ["src/content/", "content"],
    ["verification/", "verification"],
    ["tools/", "tools"],
  ];
  for (const [prefix, layer] of prefixes) {
    if (relPath.startsWith(prefix)) return layer;
  }
  return relPath.includes("/") ? undefined : "root";
}

const ALLOWED: Record<string, readonly string[]> = {
  root: ["shared", "tools"],
  shared: ["shared"],
  styles: ["styles"],
  primitives: ["primitives", "shared", "styles"],
  catalog: ["catalog", "shared"],
  shell: ["shell", "primitives", "catalog", "shared", "styles"],
  pages: ["features", "catalog", "shared"],
  "content-config": ["shared"],
  verification: ["verification"],
  tools: ["tools", "verification", "shared"],
  feature: ["self", "shell", "primitives", "catalog", "shared", "styles"],
};

const WHY: Record<string, string> = {
  shared: "src/shared is the bottom layer (pure constants and helpers); it must not depend on anything above it.",
  styles: "src/styles holds global tokens and base CSS only.",
  primitives: "src/primitives are generic UI building blocks; they must not know about content, the shell, or features.",
  catalog: "src/catalog is the only gateway to content; it must stay free of UI.",
  shell: "src/shell is the site chrome; it may use primitives and catalog but never a feature.",
  pages: "src/pages are thin routes: import one feature page component and the catalog for getStaticPaths. Put markup and styles in a feature.",
  "content-config": "src/content.config.ts declares schemas only.",
  verification: "verification/ describes the product from the user's side and must not import implementation code.",
  tools: "tools/ may read verification/ and the plain constants in src/shared, but nothing else in src/.",
  root: "Root config files may only use src/shared and tools/.",
  feature: "Features are isolated folders. Move shared logic down into src/catalog (content queries) or src/primitives (UI) and import it from both features.",
};

function family(layer: Layer): string {
  return layer.startsWith("feature:") ? "feature" : layer;
}

export function importViolation(from: Layer, to: Layer): string | undefined {
  const fromFamily = family(from);
  const allowed = ALLOWED[fromFamily] ?? [];
  if (to === "content") {
    return "Never import files from src/content directly. Read entries through src/catalog (getCollection lives there).";
  }
  if (fromFamily === "feature") {
    if (to === from) return undefined;
    if (to.startsWith("feature:")) return WHY["feature"];
  }
  if (fromFamily === "pages" && to.startsWith("feature:")) return undefined;
  if (allowed.includes(family(to))) return undefined;
  return WHY[fromFamily] ?? "This import crosses a layer boundary.";
}

export const CONTENT_GATEWAYS: readonly Layer[] = ["catalog", "content-config"];
