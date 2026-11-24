import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";
import type { Target } from "../../verification/feature-map.ts";

export async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch (error) {
    if (!String(error).includes("Executable doesn't exist")) throw error;
    return chromium.launch({ channel: "chrome" });
  }
}

export type PageWatch = { errors: string[]; failedRequests: string[] };

export function watch(page: Page, origin: string): PageWatch {
  const result: PageWatch = { errors: [], failedRequests: [] };
  page.on("pageerror", (error) => result.errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    const resourceError = message.text().startsWith("Failed to load resource");
    if (message.type() === "error" && !resourceError) result.errors.push(`console: ${message.text()}`);
  });
  page.on("response", (response) => {
    const isDocument = response.request().resourceType() === "document";
    if (!isDocument && response.url().startsWith(origin) && response.status() >= 400) {
      result.failedRequests.push(`${response.status()} ${response.url()}`);
    }
  });
  return result;
}

type RoleOptions = NonNullable<Parameters<Page["getByRole"]>[1]>;

function roleOptions(name: string | RegExp | undefined, level?: number): RoleOptions {
  const options: RoleOptions = {};
  if (name !== undefined) {
    options.name = name;
    if (typeof name === "string") options.exact = true;
  }
  if (level !== undefined) options.level = level;
  return options;
}

export function locate(page: Page, target: Target): Locator {
  const scope = target.within ? page.getByRole(target.within.role, roleOptions(target.within.name)).first() : page;
  return scope.getByRole(target.role, roleOptions(target.name, target.level));
}

export function describe(target: Target): string {
  const name = target.name === undefined ? "" : ` "${String(target.name)}"`;
  const within = target.within ? ` in ${target.within.role}${target.within.name ? ` "${target.within.name}"` : ""}` : "";
  return `${target.role}${target.level ? `(h${target.level})` : ""}${name}${within}`;
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

export async function loadAllImages(page: Page): Promise<{ total: number; loaded: number; broken: string[] }> {
  return page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.all(
      images.map((image) => {
        image.loading = "eager";
        return image.decode().catch(() => null);
      }),
    );
    const broken = images.filter((image) => image.naturalWidth === 0).map((image) => image.currentSrc || image.src);
    return { total: images.length, loaded: images.length - broken.length, broken };
  });
}

export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

export async function newContext(browser: Browser, viewport: { width: number; height: number }, calm: boolean): Promise<BrowserContext> {
  return browser.newContext({ viewport, reducedMotion: calm ? "reduce" : "no-preference", deviceScaleFactor: 1 });
}
