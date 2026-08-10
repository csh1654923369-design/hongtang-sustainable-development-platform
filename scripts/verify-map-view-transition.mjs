import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const baseURL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const edgePath = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outputDir = resolve(process.env.QA_OUTPUT ?? ".qa");
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
const page = await context.newPage();

try {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  const experience = page.locator(".home-experience");
  const basemapControl = page.locator(".home-basemap-control");
  await experience.waitFor();
  const geoLibreEntry = page.getByRole("link", { name: "进入GeoLibre专业地图编辑", exact: true });
  await geoLibreEntry.waitFor();
  assert.equal(await geoLibreEntry.getAttribute("href"), "/geolibre-lab");
  assert.equal(await geoLibreEntry.getAttribute("target"), "_blank");
  assert.match(await geoLibreEntry.getAttribute("rel"), /noopener/);
  assert.match(await geoLibreEntry.textContent(), /地图编辑/);
  assert.equal(await geoLibreEntry.evaluate((element) => element.parentElement?.classList.contains("home-map-controls")), true);
  const basemapBox = await basemapControl.boundingBox();
  const geoLibreBox = await geoLibreEntry.boundingBox();
  assert(basemapBox && geoLibreBox);
  assert(geoLibreBox.y >= basemapBox.y + basemapBox.height - 1);
  const [geoLibreWindow] = await Promise.all([
    page.waitForEvent("popup"),
    geoLibreEntry.click(),
  ]);
  await geoLibreWindow.waitForURL(/\/geolibre-lab(?:\?.*)?$/, { waitUntil: "domcontentloaded" });
  assert.match(geoLibreWindow.url(), /\/geolibre-lab$/);
  await geoLibreWindow.close();
  await page.screenshot({ path: resolve(outputDir, "home-geolibre-entry.png"), fullPage: false });
  await page.setViewportSize({ width: 375, height: 812 });
  const mobileLeftBox = await page.locator(".home-floating-left").boundingBox();
  const mobileControlsBox = await page.locator(".home-map-controls").boundingBox();
  assert(mobileLeftBox && mobileControlsBox);
  assert(mobileLeftBox.x + mobileLeftBox.width < mobileControlsBox.x);
  await page.screenshot({ path: resolve(outputDir, "home-geolibre-entry-mobile.png"), fullPage: false });
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(await experience.getAttribute("data-home-map-mode"), "2d");
  assert.equal(await experience.getAttribute("data-rendered-home-map-mode"), "2d");

  await page.getByRole("button", { name: "3D实景", exact: true }).click();
  assert.equal(await experience.getAttribute("data-home-map-mode"), "3d");
  assert.equal(await experience.getAttribute("data-rendered-home-map-mode"), "2d");
  assert.equal(await experience.getAttribute("data-home-map-transitioning"), "true");
  assert.match(await basemapControl.getAttribute("class"), /collapsed/);
  await page.locator(".home-experience[data-rendered-home-map-mode='3d']").waitFor({ timeout: 3000 });

  await page.getByRole("button", { name: "2D地图", exact: true }).click();
  assert.equal(await experience.getAttribute("data-home-map-mode"), "2d");
  assert.equal(await experience.getAttribute("data-rendered-home-map-mode"), "3d");
  assert.equal(await experience.getAttribute("data-home-map-transitioning"), "true");
  assert.match(await basemapControl.getAttribute("class"), /open/);

  await page.waitForTimeout(140);
  assert.equal(await experience.getAttribute("data-rendered-home-map-mode"), "3d");
  await page.locator(".home-experience[data-rendered-home-map-mode='2d']").waitFor({ timeout: 3000 });
  assert.equal(await experience.getAttribute("data-home-map-transitioning"), "false");
  await page.locator(".home-map-mode .map-explorer").waitFor();

  console.log(JSON.stringify({
    status: "passed",
    uiFirstDelayMs: 260,
    controlsExpandedBefore2dMount: true,
  }, null, 2));
} finally {
  await browser.close();
}
