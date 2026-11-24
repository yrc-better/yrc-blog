import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Browser, Page } from "playwright";
import { FEATURES, LAYOUT_WIDTHS, VIEWPORTS, type Feature, type Proof, type Step } from "../../verification/feature-map.ts";
import { describe, horizontalOverflow, loadAllImages, locate, newContext, settle, watch } from "./browser.ts";
import type { StaticSite } from "./static-server.ts";

export type Check = { label: string; ok: boolean; detail?: string };
export type FeatureResult = { feature: Feature; checks: Check[]; shots: string[] };

const EXPECT_TIMEOUT = 5000;

async function linkStatus(href: string): Promise<number> {
  const response = await fetch(href, { method: "GET", redirect: "follow" });
  return response.status;
}

async function runStep(page: Page, site: StaticSite, step: Step): Promise<string> {
  if ("press" in step) {
    await page.keyboard.press(step.press);
    return `press ${step.press}`;
  }
  if ("type" in step) {
    await page.keyboard.type(step.type);
    return `type "${step.type}"`;
  }
  if ("click" in step) {
    await locate(page, step.click).first().click({ timeout: EXPECT_TIMEOUT });
    return `click ${describe(step.click)}`;
  }
  if ("expectVisible" in step) {
    await locate(page, step.expectVisible).first().waitFor({ state: "visible", timeout: EXPECT_TIMEOUT });
    return `see ${describe(step.expectVisible)}`;
  }
  const expected = new URL(site.url(step.expectPath)).pathname;
  await page.waitForURL((url) => url.pathname === expected, { timeout: EXPECT_TIMEOUT });
  return `at ${decodeURI(expected)}`;
}

async function runProof(page: Page, site: StaticSite, proof: Proof, feature: Feature, shotDir: string): Promise<Check> {
  try {
    switch (proof.kind) {
      case "visible": {
        await locate(page, proof.target).first().waitFor({ state: "visible", timeout: EXPECT_TIMEOUT });
        return { label: `visible ${describe(proof.target)}`, ok: true };
      }
      case "resolves": {
        const link = locate(page, proof.target).first();
        await link.waitFor({ state: "visible", timeout: EXPECT_TIMEOUT });
        const href = await link.evaluate((element) => (element instanceof HTMLAnchorElement ? element.href : ""));
        const status = href ? await linkStatus(href) : 0;
        return { label: `link ${describe(proof.target)} resolves`, ok: status > 0 && status < 400, detail: `${status} ${decodeURI(href)}` };
      }
      case "count": {
        const count = await page.locator(proof.selector).count();
        const ok = count >= proof.min && (proof.max === undefined || count <= proof.max);
        const range = proof.max === undefined ? `≥ ${proof.min}` : `${proof.min}–${proof.max}`;
        return { label: `${proof.what} ${range}`, ok, detail: `found ${count}` };
      }
      case "images-loaded": {
        const images = await loadAllImages(page);
        const ok = images.broken.length === 0 && images.loaded >= proof.min;
        return { label: `images loaded ≥ ${proof.min}`, ok, detail: `${images.loaded}/${images.total}${images.broken.length ? ` broken: ${images.broken.join(", ")}` : ""}` };
      }
      case "flow": {
        const trail: string[] = [];
        for (const step of proof.steps) trail.push(await runStep(page, site, step));
        const shot = path.join(shotDir, `${feature.id}.flow-${slug(proof.name)}.png`);
        await page.screenshot({ path: shot });
        return { label: `flow: ${proof.name}`, ok: true, detail: trail.join(" → ") };
      }
    }
  } catch (error) {
    return { label: proofLabel(proof), ok: false, detail: firstLine(error) };
  }
}

function proofLabel(proof: Proof): string {
  if (proof.kind === "visible" || proof.kind === "resolves") return `${proof.kind} ${describe(proof.target)}`;
  if (proof.kind === "flow") return `flow: ${proof.name}`;
  if (proof.kind === "count") return proof.what;
  return "images loaded";
}

function firstLine(error: unknown): string {
  return String(error instanceof Error ? error.message : error).split("\n")[0] ?? "unknown error";
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function verifyFeature(browser: Browser, site: StaticSite, feature: Feature, shotDir: string, seenLinks: Set<string>): Promise<FeatureResult> {
  const checks: Check[] = [];
  const shots: string[] = [];
  const expectedStatus = feature.status ?? 200;

  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    const context = await newContext(browser, viewport, true);
    const page = await context.newPage();
    const watched = watch(page, site.origin);
    const response = await page.goto(site.url(feature.path));
    await settle(page);
    const tag = `[${viewportName}]`;

    checks.push({ label: `${tag} HTTP ${expectedStatus}`, ok: response?.status() === expectedStatus, detail: `got ${response?.status() ?? "none"}` });
    checks.push({ label: `${tag} header visible`, ok: await page.getByRole("banner").isVisible() });
    const overflow = await horizontalOverflow(page);
    checks.push({ label: `${tag} no horizontal overflow`, ok: overflow <= 1, detail: `${overflow}px` });

    if (viewportName === "desktop") {
      for (const proof of feature.proves.filter((p) => p.kind !== "flow")) checks.push(await runProof(page, site, proof, feature, shotDir));
      const hrefs = await page.$$eval("a[href]:not([href^='#'])", (anchors) => anchors.map((a) => (a as HTMLAnchorElement).href));
      for (const href of hrefs) {
        if (href.startsWith(site.origin)) seenLinks.add(href.split("#")[0] ?? href);
      }
    }

    const shot = path.join(shotDir, `${feature.id}.${viewportName}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    shots.push(shot);

    checks.push({ label: `${tag} no console/page errors`, ok: watched.errors.length === 0, detail: watched.errors.join(" | ") });
    checks.push({ label: `${tag} no failed asset requests`, ok: watched.failedRequests.length === 0, detail: watched.failedRequests.join(" | ") });
    await context.close();
  }

  for (const proof of feature.proves.filter((p) => p.kind === "flow")) {
    const context = await newContext(browser, VIEWPORTS.desktop, true);
    const page = await context.newPage();
    const watched = watch(page, site.origin);
    await page.goto(site.url(feature.path));
    await settle(page);
    const check = await runProof(page, site, proof, feature, shotDir);
    if (watched.errors.length > 0) {
      check.ok = false;
      check.detail = `${check.detail ?? ""} errors: ${watched.errors.join(" | ")}`;
    }
    checks.push(check);
    await context.close();
  }

  return { feature, checks, shots };
}

export async function verifyAll(browser: Browser, site: StaticSite, outDir: string, only?: string[]): Promise<{ results: FeatureResult[]; brokenLinks: string[] }> {
  mkdirSync(outDir, { recursive: true });
  const features = only?.length ? FEATURES.filter((feature) => only.includes(feature.id)) : FEATURES;
  const seenLinks = new Set<string>();
  const results: FeatureResult[] = [];
  for (const feature of features) {
    const result = await verifyFeature(browser, site, feature, outDir, seenLinks);
    results.push(result);
    const failed = result.checks.filter((check) => !check.ok);
    console.log(`${failed.length === 0 ? "✔" : "✖"} ${feature.id.padEnd(16)} ${result.checks.length - failed.length}/${result.checks.length} checks`);
    for (const check of failed) console.log(`    ✖ ${check.label}${check.detail ? `  →  ${check.detail}` : ""}`);
  }

  const brokenLinks: string[] = [];
  for (const href of seenLinks) {
    const status = await linkStatus(href);
    if (status >= 400) brokenLinks.push(`${status} ${decodeURI(href)}`);
  }
  console.log(`${brokenLinks.length === 0 ? "✔" : "✖"} internal links      ${seenLinks.size - brokenLinks.length}/${seenLinks.size} resolve`);
  for (const link of brokenLinks) console.log(`    ✖ ${link}`);

  const overflows = await sweepWidths(browser, site, [...new Set(features.map((feature) => feature.path))]);
  console.log(`${overflows.length === 0 ? "✔" : "✖"} layout widths       ${LAYOUT_WIDTHS.join("/")}px without horizontal overflow`);
  for (const overflow of overflows) console.log(`    ✖ ${overflow}  (diagnose: npm run site -- overflow <path> --width <px>)`);
  brokenLinks.push(...overflows);

  writeReport(outDir, results, brokenLinks);
  return { results, brokenLinks };
}

async function sweepWidths(browser: Browser, site: StaticSite, paths: string[]): Promise<string[]> {
  const problems: string[] = [];
  for (const width of LAYOUT_WIDTHS) {
    const context = await newContext(browser, { width, height: 800 }, true);
    const page = await context.newPage();
    for (const sitePath of paths) {
      await page.goto(site.url(sitePath));
      await settle(page);
      const overflow = await horizontalOverflow(page);
      if (overflow > 1) problems.push(`/${sitePath} overflows by ${overflow}px at ${width}px`);
    }
    await context.close();
  }
  return problems;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}

function writeReport(outDir: string, results: FeatureResult[], brokenLinks: string[]): void {
  writeFileSync(path.join(outDir, "report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), results: results.map((r) => ({ id: r.feature.id, checks: r.checks })), brokenLinks }, null, 2));
  const sections = results
    .map((result) => {
      const rows = result.checks
        .map((check) => `<li class="${check.ok ? "ok" : "bad"}">${check.ok ? "✔" : "✖"} ${escapeHtml(check.label)}${check.detail ? ` <small>${escapeHtml(check.detail)}</small>` : ""}</li>`)
        .join("");
      const images = result.shots.map((shot) => `<img src="${escapeHtml(path.basename(shot))}" alt="${escapeHtml(path.basename(shot))}" loading="lazy">`).join("");
      return `<section><h2>${escapeHtml(result.feature.id)} — ${escapeHtml(result.feature.title)}</h2><p><b>Reach:</b> ${escapeHtml(result.feature.reach)}</p><ul>${rows}</ul><div class="shots">${images}</div></section>`;
    })
    .join("");
  const html = `<!doctype html><meta charset="utf-8"><title>Verification proof</title><style>body{font:14px/1.6 system-ui;background:#0b0e18;color:#e8f0ff;margin:32px}h2{color:#fcee0a}li.ok{color:#3dff8b}li.bad{color:#ff2a6d}small{color:#93a0bd}.shots{display:flex;gap:16px;align-items:flex-start;overflow-x:auto}.shots img{max-height:520px;border:1px solid #333}section{border-top:1px solid #333;padding:16px 0}</style><h1>Verification proof</h1><p>Broken internal links: ${brokenLinks.length}</p>${sections}`;
  writeFileSync(path.join(outDir, "index.html"), html);
}
