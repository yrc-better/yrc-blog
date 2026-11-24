import path from "node:path";
import type { Browser, Page } from "playwright";
import { EMBEDDED_APPS, VIEWPORTS } from "../../verification/feature-map.ts";
import { horizontalOverflow, newContext, settle, watch } from "./browser.ts";
import type { StaticSite } from "./static-server.ts";

type Random = () => number;

function mulberry32(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const QUERIES = ["lopd", "蒸馏", "芳草", "python", "projects", "🎸", "<script>", "../../", "%E4%B8%AD", "\u200b", "a".repeat(120), "  ", "ＳＹＮＮ", "零"];
const KEYS = ["Tab", "/", "Escape", "ArrowDown", "End", "Home", "PageDown"];

export type FuzzResult = { seed: number; steps: number; trail: string[]; failure?: string };

function pick<T>(random: Random, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error("pick from empty list");
  return item;
}

function inEmbeddedApp(site: StaticSite, url: string): boolean {
  return EMBEDDED_APPS.some((app) => url.startsWith(site.url(app)));
}

async function onNotFoundPage(page: Page): Promise<boolean> {
  return page.getByRole("heading", { level: 1, name: "Signal lost", exact: true }).isVisible();
}

export async function fuzz(browser: Browser, site: StaticSite, seed: number, steps: number, outDir: string): Promise<FuzzResult> {
  const random = mulberry32(seed);
  const context = await newContext(browser, VIEWPORTS.desktop, false);
  const page = await context.newPage();
  const watched = watch(page, site.origin);
  const trail: string[] = [];
  let lastStatus = 200;
  page.on("response", (response) => {
    if (response.request().isNavigationRequest() && response.url().startsWith(site.origin)) lastStatus = response.status();
  });

  const fail = async (reason: string): Promise<FuzzResult> => {
    await page.screenshot({ path: path.join(outDir, `fuzz-failure-${seed}.png`), fullPage: true }).catch(() => undefined);
    await context.close();
    return { seed, steps: trail.length, trail, failure: reason };
  };

  await page.goto(site.url(""));
  await settle(page);

  for (let i = 0; i < steps; i += 1) {
    const roll = random();
    let navigatedByLink = false;

    if (inEmbeddedApp(site, page.url())) {
      trail.push("leave embedded app");
      await page.goto(site.url(""));
    } else if (roll < 0.38) {
      const links = await page.$$eval("a[href]:not([target='_blank'])", (anchors) =>
        anchors
          .filter((a) => {
            const rect = a.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && getComputedStyle(a).visibility !== "hidden";
          })
          .map((a) => (a as HTMLAnchorElement).href),
      );
      const internal = links.filter((href) => href.startsWith(site.origin));
      if (internal.length > 0) {
        const href = pick(random, internal);
        trail.push(`click link ${decodeURI(href.replace(site.origin, ""))}`);
        await page.locator(`a[href="${decodeURI(new URL(href).pathname)}"]:visible`).first().click({ timeout: 3000 }).catch(async () => {
          await page.goto(href);
        });
        navigatedByLink = true;
      }
    } else if (roll < 0.62) {
      const query = pick(random, QUERIES);
      const enter = random() < 0.5;
      trail.push(`palette "${query.length > 20 ? `${query.slice(0, 20)}…` : query}"${enter ? " + Enter" : " + Escape"}`);
      await page.keyboard.press("Control+k");
      const input = page.getByRole("combobox", { name: "Search the site" });
      if (await input.isVisible().catch(() => false)) {
        await input.fill(query);
        for (let n = Math.floor(random() * 3); n > 0; n -= 1) await page.keyboard.press("ArrowDown");
        await page.keyboard.press(enter ? "Enter" : "Escape");
        navigatedByLink = enter;
      }
    } else if (roll < 0.72) {
      trail.push("back");
      await page.goBack().catch(() => undefined);
    } else if (roll < 0.82) {
      const width = 320 + Math.floor(random() * 1280);
      trail.push(`resize ${width}px`);
      await page.setViewportSize({ width, height: 800 });
    } else if (roll < 0.9) {
      const dy = Math.floor(random() * 3000) - 800;
      trail.push(`scroll ${dy}`);
      await page.mouse.wheel(0, dy);
    } else {
      const key = pick(random, KEYS);
      trail.push(`key ${key}`);
      await page.keyboard.press(key);
    }

    await page.waitForLoadState("domcontentloaded").catch(() => undefined);

    if (watched.errors.length > 0) return fail(`runtime error: ${watched.errors.join(" | ")}`);
    if (watched.failedRequests.length > 0) return fail(`failed request: ${watched.failedRequests.join(" | ")}`);
    if (!page.url().startsWith(site.url(""))) {
      trail.push(`left site (${page.url().slice(0, 40)}), re-enter`);
      await page.goto(site.url(""));
      continue;
    }
    if (inEmbeddedApp(site, page.url())) {
      if (lastStatus >= 400) return fail(`embedded app returned ${lastStatus}`);
      continue;
    }
    if (navigatedByLink && (lastStatus >= 400 || (await onNotFoundPage(page)))) return fail(`internal navigation hit 404 at ${decodeURI(page.url())}`);
    if (!(await page.getByRole("banner").isVisible())) return fail("site header disappeared");
    const overflow = await horizontalOverflow(page);
    if (overflow > 1) return fail(`horizontal overflow of ${overflow}px at width ${page.viewportSize()?.width}`);
  }

  await context.close();
  return { seed, steps: trail.length, trail };
}
