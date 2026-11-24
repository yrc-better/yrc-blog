export type Role =
  | "link"
  | "button"
  | "heading"
  | "navigation"
  | "region"
  | "dialog"
  | "option"
  | "banner"
  | "contentinfo"
  | "main"
  | "combobox"
  | "status";

export type Target = { role: Role; name?: string | RegExp; level?: 1 | 2 | 3; within?: { role: Role; name?: string } };

export type Step =
  | { press: string }
  | { type: string }
  | { click: Target }
  | { expectVisible: Target }
  | { expectPath: string };

export type Proof =
  | { kind: "visible"; target: Target }
  | { kind: "resolves"; target: Target }
  | { kind: "count"; selector: string; min: number; max?: number; what: string }
  | { kind: "images-loaded"; min: number }
  | { kind: "flow"; name: string; steps: Step[] };

export type Feature = {
  id: string;
  title: string;
  page: string;
  path: string;
  status?: 200 | 404;
  reach: string;
  proves: Proof[];
};

const PAPER = "papers/latent-on-policy-self-distillation/";

export const EMBEDDED_APPS: readonly string[] = ["projects/band-simulator/"];

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

export const LAYOUT_WIDTHS: readonly number[] = [320, 360, 414, 600, 768, 900, 1024, 1280];

export const FEATURES: readonly Feature[] = [
  {
    id: "home",
    title: "Home: hero, ID card, section portals, transmission feed",
    page: "src/pages/index.astro",
    path: "",
    reach: "Open the site root, or click the SYNN//SPACE logo in the header from any page.",
    proves: [
      { kind: "visible", target: { role: "heading", level: 1, name: "synn's space" } },
      { kind: "visible", target: { role: "navigation", name: "Primary" } },
      { kind: "resolves", target: { role: "link", name: "Papers", within: { role: "region", name: "Sections" } } },
      { kind: "resolves", target: { role: "link", name: "Projects", within: { role: "region", name: "Sections" } } },
      { kind: "resolves", target: { role: "link", name: "Blog", within: { role: "region", name: "Sections" } } },
      { kind: "count", selector: "section[aria-labelledby='feed-title'] li a", min: 3, what: "feed entries" },
      { kind: "images-loaded", min: 1 },
    ],
  },
  {
    id: "command-palette",
    title: "Command palette: jump to any page or entry by keyboard",
    page: "src/pages/index.astro",
    path: "",
    reach: "Press ⌘K / Ctrl+K or '/' on any page, or click the Search button in the header.",
    proves: [
      {
        kind: "flow",
        name: "keyboard search opens the LOPD paper",
        steps: [
          { press: "Control+k" },
          { expectVisible: { role: "dialog", name: "Command palette" } },
          { type: "lopd" },
          { expectVisible: { role: "option", name: /潜在同策略蒸馏/ } },
          { press: "Enter" },
          { expectPath: PAPER },
        ],
      },
      {
        kind: "flow",
        name: "header button opens the palette and escape closes it",
        steps: [
          { click: { role: "button", name: "Search", within: { role: "banner" } } },
          { expectVisible: { role: "combobox", name: "Search the site" } },
          { type: "zzzz-no-such-node" },
          { expectVisible: { role: "status" } },
          { press: "Escape" },
          { expectPath: "" },
        ],
      },
    ],
  },
  {
    id: "papers-index",
    title: "Papers index",
    page: "src/pages/papers/index.astro",
    path: "papers/",
    reach: "Header nav → 01 Papers, or the Papers portal on the home page.",
    proves: [
      { kind: "visible", target: { role: "heading", level: 1, name: "Papers" } },
      { kind: "resolves", target: { role: "link", name: "潜在同策略蒸馏" } },
    ],
  },
  {
    id: "paper-article",
    title: "Paper reading notes with math, figures and table of contents",
    page: "src/pages/papers/[slug].astro",
    path: PAPER,
    reach: "Papers index → click a paper card; or the home feed; or the command palette.",
    proves: [
      { kind: "visible", target: { role: "heading", level: 1, name: "潜在同策略蒸馏" } },
      { kind: "visible", target: { role: "navigation", name: "Breadcrumb" } },
      { kind: "visible", target: { role: "navigation", name: "On this page" } },
      { kind: "count", selector: ".prose .katex", min: 50, what: "rendered KaTeX formulas" },
      { kind: "count", selector: ".prose .katex-error", min: 0, max: 0, what: "KaTeX errors" },
      { kind: "images-loaded", min: 7 },
      { kind: "count", selector: ".prose table tr", min: 5, what: "table rows" },
    ],
  },
  {
    id: "posts-index",
    title: "Blog index grouped by category",
    page: "src/pages/posts/index.astro",
    path: "posts/",
    reach: "Header nav → 03 Blog, or the Blog portal on the home page.",
    proves: [
      { kind: "visible", target: { role: "heading", level: 1, name: "Blog" } },
      { kind: "resolves", target: { role: "link", name: "复旦江湾研0租房经验（芳草寓）" } },
      { kind: "resolves", target: { role: "link", name: "Python 示例" } },
    ],
  },
  {
    id: "post-article",
    title: "Life post with photo gallery",
    page: "src/pages/posts/[slug].astro",
    path: "posts/复旦江湾研0租房经验/",
    reach: "Blog index → Life → click the post.",
    proves: [
      { kind: "visible", target: { role: "heading", level: 1, name: "复旦江湾研0租房经验（芳草寓）" } },
      { kind: "images-loaded", min: 5 },
      { kind: "resolves", target: { role: "link", name: /Older|Newer/ } },
    ],
  },
  {
    id: "post-code",
    title: "Notes post with highlighted code and output blocks",
    page: "src/pages/posts/[slug].astro",
    path: "posts/python-demo/",
    reach: "Blog index → Notes → Python 示例.",
    proves: [
      { kind: "visible", target: { role: "heading", level: 1, name: "Python 示例" } },
      { kind: "count", selector: ".prose pre.astro-code", min: 4, what: "code blocks" },
    ],
  },
  {
    id: "projects-index",
    title: "Projects with live status and play link",
    page: "src/pages/projects/index.astro",
    path: "projects/",
    reach: "Header nav → 02 Projects, or the Projects portal on the home page.",
    proves: [
      { kind: "visible", target: { role: "heading", level: 1, name: "Projects" } },
      { kind: "resolves", target: { role: "link", name: "立即游玩：乐队模拟器" } },
    ],
  },
  {
    id: "not-found",
    title: "404 page for unknown routes",
    page: "src/pages/404.astro",
    path: "this-route-does-not-exist/",
    status: 404,
    reach: "Follow any broken or mistyped link.",
    proves: [
      { kind: "visible", target: { role: "heading", level: 1, name: "Signal lost" } },
      { kind: "resolves", target: { role: "link", name: "Return home" } },
    ],
  },
];
