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
  const mapEditorEntry = page.getByRole("link", { name: "进入红塘地图数据编辑", exact: true });
  await mapEditorEntry.waitFor();
  assert.match(await mapEditorEntry.getAttribute("href") ?? "", /\/map-editor\/?$/);
  assert.equal(await mapEditorEntry.getAttribute("target"), "_blank");
  assert.match(await mapEditorEntry.getAttribute("rel"), /noopener/);
  assert.match(await mapEditorEntry.textContent(), /地图编辑/);
  assert.equal(await mapEditorEntry.evaluate((element) => element.parentElement?.classList.contains("home-map-controls")), true);
  const basemapBox = await basemapControl.boundingBox();
  const mapEditorBox = await mapEditorEntry.boundingBox();
  assert(basemapBox && mapEditorBox);
  assert(mapEditorBox.y >= basemapBox.y + basemapBox.height - 1);
  const [mapEditorWindow] = await Promise.all([
    page.waitForEvent("popup"),
    mapEditorEntry.click(),
  ]);
  await mapEditorWindow.waitForURL(/\/map-editor\/?(?:\?.*)?$/, { waitUntil: "domcontentloaded" });
  assert.match(mapEditorWindow.url(), /\/map-editor\/?$/);
  await mapEditorWindow.close();
  await page.screenshot({ path: resolve(outputDir, "home-map-editor-entry.png"), fullPage: false });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(280);
  const mobileBrand = page.locator(".home-floating-brand");
  const mobileInterfaceBox = await page.locator(".home-floating-interface").boundingBox();
  const mobileBrandBox = await mobileBrand.boundingBox();
  const mobileViewToggleBox = await page.locator(".home-view-toggle").boundingBox();
  const mobileBasemapBox = await page.locator(".home-basemap-control").boundingBox();
  const mobileEditorBox = await mapEditorEntry.boundingBox();
  const mobileTopicBox = await page.locator(".home-topic-card").boundingBox();
  assert(mobileInterfaceBox && mobileBrandBox && mobileViewToggleBox && mobileBasemapBox && mobileEditorBox && mobileTopicBox);
  assert(mobileInterfaceBox.height <= 100);
  assert(Math.abs(mobileBrandBox.y - mobileViewToggleBox.y) < 2);
  assert(Math.abs(mobileBasemapBox.y - mobileEditorBox.y) < 2);
  assert(mobileTopicBox.y >= mobileInterfaceBox.y + mobileInterfaceBox.height + 5);
  assert(mobileTopicBox.width <= 240);
  assert.equal(await mobileBrand.getByText("红塘村可持续发展平台", { exact: true }).isVisible(), true);
  assert(mobileViewToggleBox.x >= 0 && mobileViewToggleBox.x + mobileViewToggleBox.width <= 375);
  assert(mobileBasemapBox.x >= 0 && mobileBasemapBox.x + mobileBasemapBox.width <= 375);
  assert(mobileEditorBox.x >= 0 && mobileEditorBox.x + mobileEditorBox.width <= 375);
  await page.screenshot({ path: resolve(outputDir, "home-map-editor-entry-mobile.png"), fullPage: false });
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
