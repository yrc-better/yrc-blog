import path from "node:path";
import { parseArgs } from "node:util";
import { SITE } from "../../src/shared/site.ts";
import { FEATURES, VIEWPORTS } from "../../verification/feature-map.ts";
import { launchBrowser, loadAllImages, newContext, settle } from "./browser.ts";
import { serveDist, type StaticSite } from "./static-server.ts";
import { verifyAll } from "./verify.ts";
import { fuzz } from "./fuzz.ts";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const DIST = path.join(ROOT, "dist");
const PROOF = path.join(ROOT, "proof");

const USAGE = `usage: npm run site -- <command> [options]

  serve [--port 4321]                 serve dist/ exactly like GitHub Pages (base ${SITE.basePath}/)
  verify [--only id,id]               walk the feature map, write screenshots + report to proof/
  fuzz [--seed n] [--steps n] [--runs n]  random user walk checking global invariants
  snapshot <path>                     print the accessibility tree of a page
  screenshot <path> <file> [--mobile] [--viewport] [--at <css selector>] [--press <key>] [--type <text>]
                                      full page by default; --at scrolls to an element; --press/--type act before capture
  click <path> --name <text> [--role link|button]  click an element by accessible name, print where it lands
  overflow [path…] [--width 360]      list elements that stick out past the viewport (all feature routes by default)
  features                            list the feature map

  features: ${FEATURES.map((feature) => feature.id).join(", ")}`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: "string" },
    only: { type: "string" },
    seed: { type: "string" },
    steps: { type: "string" },
    runs: { type: "string" },
    mobile: { type: "boolean" },
    viewport: { type: "boolean" },
    at: { type: "string" },
    press: { type: "string" },
    type: { type: "string" },
    width: { type: "string" },
    name: { type: "string" },
    role: { type: "string" },
  },
});

const [command, ...args] = positionals;

async function withSite<T>(run: (site: StaticSite) => Promise<T>): Promise<T> {
  const site = await serveDist(DIST, SITE.basePath);
  try {
    return await run(site);
  } finally {
    await site.close();
  }
}

async function main(): Promise<number> {
  switch (command) {
    case "serve": {
      const site = await serveDist(DIST, SITE.basePath, Number(values.port ?? 4321));
      console.log(`serving dist/ at ${site.url("")}`);
      return new Promise<number>(() => undefined);
    }
    case "features": {
      for (const feature of FEATURES) console.log(`${feature.id.padEnd(16)} /${feature.path.padEnd(44)} ${feature.reach}`);
      return 0;
    }
    case "verify": {
      return withSite(async (site) => {
        const browser = await launchBrowser();
        try {
          const { results, brokenLinks } = await verifyAll(browser, site, PROOF, values.only?.split(","));
          const failed = results.flatMap((result) => result.checks.filter((check) => !check.ok));
          console.log(`\nproof written to ${path.relative(ROOT, PROOF)}/index.html`);
          return failed.length === 0 && brokenLinks.length === 0 ? 0 : 1;
        } finally {
          await browser.close();
        }
      });
    }
    case "fuzz": {
      return withSite(async (site) => {
        const browser = await launchBrowser();
        const runs = Number(values.runs ?? 3);
        const steps = Number(values.steps ?? 60);
        const firstSeed = values.seed ? Number(values.seed) : Math.floor(Math.random() * 1e9);
        let failures = 0;
        try {
          for (let run = 0; run < runs; run += 1) {
            const seed = firstSeed + run;
            const result = await fuzz(browser, site, seed, steps, PROOF);
            if (result.failure) {
              failures += 1;
              console.log(`✖ seed ${seed}: ${result.failure}\n  replay: npm run fuzz -- --seed ${seed} --runs 1 --steps ${steps}`);
              result.trail.slice(-8).forEach((step) => console.log(`    … ${step}`));
            } else {
              console.log(`✔ seed ${seed}: ${result.steps} steps, invariants held`);
            }
          }
        } finally {
          await browser.close();
        }
        return failures === 0 ? 0 : 1;
      });
    }
    case "overflow": {
      const width = Number(values.width ?? 360);
      return withSite(async (site) => {
        const browser = await launchBrowser();
        try {
          let found = 0;
          const targets = args.length > 0 ? args : FEATURES.map((feature) => feature.path);
          for (const target of [...new Set(targets)]) {
            const context = await newContext(browser, { width, height: 800 }, true);
            const page = await context.newPage();
            await page.goto(site.url(target));
            await settle(page);
            const culprits = await page.evaluate(() => {
              const limit = document.documentElement.clientWidth;
              const clipped = (element: HTMLElement): boolean => {
                for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
                  const style = getComputedStyle(node);
                  if (style.overflowX !== "visible" && node.getBoundingClientRect().right <= limit + 1) return true;
                  if (style.position === "fixed" && style.overflowX !== "visible") return true;
                }
                return false;
              };
              const overflowing = (element: Element): boolean => {
                const rect = element.getBoundingClientRect();
                const textEdge = rect.left + element.scrollWidth;
                const textSpills = getComputedStyle(element).overflowX === "visible" && textEdge > limit + 1;
                return rect.right > limit + 1 || textSpills;
              };
              return Array.from(document.querySelectorAll<HTMLElement>("body *"))
                .filter((element) => overflowing(element) && !clipped(element))
                .filter((element) => !element.parentElement || !overflowing(element.parentElement) || element.parentElement === document.body)
                .map((element) => `${element.tagName.toLowerCase()}.${Array.from(element.classList).join(".")} right=${Math.round(element.getBoundingClientRect().right)}`);
            });
            found += culprits.length;
            console.log(`${culprits.length === 0 ? "✔" : "✖"} /${target} @ ${width}px`);
            culprits.forEach((culprit) => console.log(`    ${culprit}`));
            await context.close();
          }
          return found === 0 ? 0 : 1;
        } finally {
          await browser.close();
        }
      });
    }
    case "snapshot":
    case "screenshot":
    case "click": {
      const target = args[0] ?? "";
      return withSite(async (site) => {
        const browser = await launchBrowser();
        try {
          const context = await newContext(browser, values.mobile ? VIEWPORTS.mobile : VIEWPORTS.desktop, true);
          const page = await context.newPage();
          await page.goto(site.url(target));
          await settle(page);
          if (command === "snapshot") console.log(await page.locator("body").ariaSnapshot());
          if (command === "screenshot") {
            const file = path.resolve(args[1] ?? path.join(PROOF, "screenshot.png"));
            if (values.at) await page.locator(values.at).first().scrollIntoViewIfNeeded();
            if (values.press) await page.keyboard.press(values.press);
            if (values.type) await page.keyboard.type(values.type);
            await loadAllImages(page);
            await page.screenshot({ path: file, fullPage: !values.at && !values.viewport && !values.press });
            console.log(`saved ${path.relative(ROOT, file)}`);
          }
          if (command === "click") {
            if (!values.name) throw new Error("click needs --name <accessible name>");
            const role = values.role === "button" ? "button" : "link";
            await page.getByRole(role, { name: values.name, exact: true }).first().click();
            await settle(page);
            console.log(`landed on ${decodeURI(new URL(page.url()).pathname)}`);
            console.log(await page.getByRole("main").ariaSnapshot());
          }
          return 0;
        } finally {
          await browser.close();
        }
      });
    }
    default:
      console.log(USAGE);
      return command ? 1 : 0;
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
