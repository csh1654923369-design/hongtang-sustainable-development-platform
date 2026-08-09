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
const consoleErrors = [];
const failedResponses = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() });
});

await page.goto(baseURL, { waitUntil: "domcontentloaded" });
await page.locator(".home-experience[data-home-map-mode='2d']").waitFor();
const mapStage = page.locator(".map-geographic-stage");
const mapFrame = page.locator(".map-geographic-frame");
const cloudMap = page.locator(".amap-village-map[data-map-provider='amap']");
const cloudMapReady = await cloudMap.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
const visibleMarkerRoot = cloudMapReady ? page.locator(".amap-react-marker-layer") : page.locator(".village-map");
if (cloudMapReady) {
  const marker = page.locator(".amap-react-marker-layer .map-marker").first();
  await marker.waitFor();
  const initialMarker = await marker.boundingBox();
  const cloudBox = await page.locator(".amap-cloud-canvas").boundingBox();
  assert(initialMarker && cloudBox);
  await page.mouse.move(cloudBox.x + cloudBox.width * 0.62, cloudBox.y + cloudBox.height * 0.66);
  await page.mouse.down();
  await page.mouse.move(cloudBox.x + cloudBox.width * 0.62 + 86, cloudBox.y + cloudBox.height * 0.66 + 54, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const draggedMarker = await marker.boundingBox();
  assert(draggedMarker);
  assert(Math.abs(draggedMarker.x - initialMarker.x) > 35);
  assert(Math.abs(draggedMarker.y - initialMarker.y) > 20);
  assert.equal(await page.locator(".map-selection-bubble").count(), 0);
  await page.getByRole("button", { name: "回到红塘", exact: true }).click();
  await page.waitForTimeout(520);
} else {
  const initialPan = await mapFrame.evaluate((element) => {
    const matrix = new DOMMatrix(getComputedStyle(element).transform);
    return { x: matrix.e, y: matrix.f };
  });
  const stageBox = await mapStage.boundingBox();
  assert(stageBox);
  await page.mouse.move(stageBox.x + stageBox.width * 0.68, stageBox.y + stageBox.height * 0.72);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + stageBox.width * 0.68 + 86, stageBox.y + stageBox.height * 0.72 + 54, { steps: 6 });
  await page.mouse.up();
  const draggedPan = await mapFrame.evaluate((element) => {
    const matrix = new DOMMatrix(getComputedStyle(element).transform);
    return { x: matrix.e, y: matrix.f };
  });
  assert(Math.abs(draggedPan.x - initialPan.x) > 40);
  assert(Math.abs(draggedPan.y - initialPan.y) > 25);
  assert.equal(await page.getByRole("button", { name: /复位视图/ }).isVisible(), true);
  await mapStage.dispatchEvent("dblclick");
  await page.waitForTimeout(520);
}
await page.screenshot({ path: resolve(outputDir, "map-2d-free-pan.png"), fullPage: false });
const sharedFilter = page.locator("[data-shared-map-filter='persistent']");
await sharedFilter.waitFor({ state: "attached" });
assert.equal(await page.locator("[data-shared-map-filter='persistent'] .map-filter-panel").count(), 1);
assert.equal(await page.locator(".water-topic-entry").count(), 0);
const topicLauncher = page.getByRole("button", { name: /^专题/ });
await topicLauncher.click();
await sharedFilter.waitFor({ state: "visible" });
await sharedFilter.evaluate((element) => element.setAttribute("data-qa-instance", "kept-across-view-switch"));
const researchLayer = sharedFilter.locator("input[data-layer-type='research-photo']");
await researchLayer.uncheck();
assert.equal(await researchLayer.isChecked(), false);
const selected2dTypes = (await sharedFilter.getAttribute("data-selected-layer-types"))?.split(",") ?? [];
assert(!selected2dTypes.includes("research-photo"));
await sharedFilter.getByRole("button", { name: "关闭专题", exact: true }).click();

await page.getByRole("button", { name: "3D实景", exact: true }).click();
await page.locator(".home-experience[data-home-map-mode='3d']").waitFor();
const sharedFrame = page.frameLocator("#hongtang-gaussian-frame");
await sharedFrame.locator("body[data-selected-point-types]").waitFor({ timeout: 30000 });
const selected3dGroups = (await sharedFrame.locator("body").getAttribute("data-selected-point-types"))?.split(",") ?? [];
assert(!selected3dGroups.includes("research"));
assert.equal(await sharedFrame.locator("#pointFilterPanel").evaluate((element) => getComputedStyle(element).display), "none");
assert.equal(await sharedFilter.getAttribute("data-qa-instance"), "kept-across-view-switch");
assert.equal(await researchLayer.isChecked(), false);

await page.getByRole("button", { name: "2D地图", exact: true }).click();
await page.locator(".home-experience[data-home-map-mode='2d']").waitFor();
await visibleMarkerRoot.locator(".map-marker").first().waitFor();
assert.equal(await sharedFilter.getAttribute("data-qa-instance"), "kept-across-view-switch");
assert.equal(await researchLayer.isChecked(), false);
assert.equal(await visibleMarkerRoot.locator(".map-marker.map-marker-dot").count(), 0);
await topicLauncher.click();
await sharedFilter.getByRole("button", { name: "进入村里用水专题", exact: true }).click();
await page.locator(".map-explorer[data-water-topic-mode='overview']").waitFor();
await page.getByRole("button", { name: "饮水从哪来", exact: true }).click();
await page.locator(".map-explorer[data-water-topic-mode='supply']").waitFor();

assert.equal(await visibleMarkerRoot.locator("[data-feature-id^='water-node-']").count(), 5);
assert.equal(await visibleMarkerRoot.locator("[data-feature-id='real-poi-15']").count(), 0);
assert.equal(await visibleMarkerRoot.locator("[data-feature-id='real-poi-22']").count(), 0);
assert.equal(await page.locator(".home-water-line").count(), 3);
assert.equal(await page.locator(".home-water-zone").count(), 3);
assert.equal(await sharedFilter.evaluate((element) => getComputedStyle(element).display), "none");

await page.locator(".home-water-zone").first().focus();
await page.keyboard.press("Enter");
await page.locator(".home-water-zone.active").waitFor();
await page.locator(".map-selection-bubble .water-spatial-detail h2").getByText("北片供水分区", { exact: true }).waitFor();
assert((await page.locator(".home-water-line.related").count()) >= 1);
assert((await visibleMarkerRoot.locator(".map-marker.related").count()) >= 2);
await page.getByRole("button", { name: "山箐水源", exact: true }).click();
await page.locator(".map-selection-bubble .water-spatial-detail h2").getByText("山箐水源", { exact: true }).waitFor();

await page.screenshot({ path: resolve(outputDir, "water-topic-2d-supply.png"), fullPage: false });

await page.getByRole("button", { name: "排水到哪里", exact: true }).click();
await page.locator(".map-explorer[data-water-topic-mode='drainage']").waitFor();
assert.equal(await visibleMarkerRoot.locator("[data-feature-id^='water-node-']").count(), 2);
assert.equal(await visibleMarkerRoot.locator("[data-feature-id='real-poi-15']").count(), 1);
assert.equal(await visibleMarkerRoot.locator("[data-feature-id='real-poi-22']").count(), 1);
assert.equal(await page.locator(".home-water-line").count(), 5);
assert.equal(await page.locator(".home-water-zone").count(), 0);
await visibleMarkerRoot.locator("[data-feature-id='water-node-pond']").evaluate((element) => element.click());
await page.locator(".map-selection-bubble .water-spatial-detail h2").getByText("中心水塘", { exact: true }).waitFor();
assert.equal(await page.getByText("流向哪里", { exact: true }).count(), 1);
await page.screenshot({ path: resolve(outputDir, "water-topic-2d-drainage.png"), fullPage: false });

await page.getByRole("button", { name: "饮水从哪来", exact: true }).click();
await page.locator(".map-explorer[data-water-topic-mode='supply']").waitFor();

await page.getByRole("button", { name: "3D实景", exact: true }).click();
await page.locator(".home-experience[data-home-map-mode='3d'] [data-gaussian-state='ready']").waitFor({ timeout: 120000 });
const frame = page.frameLocator("#hongtang-gaussian-frame");
const viewerBody = frame.locator("body[data-water-topic-mode='supply']");
await viewerBody.waitFor({ timeout: 30000 });
await frame.locator("body[data-model-ready='true']").waitFor({ timeout: 30000 });
assert.equal(await frame.locator("#pointFilterPanel").evaluate((element) => getComputedStyle(element).display), "none");
assert(Number(await viewerBody.getAttribute("data-visible-point-count")) >= 11);
assert.equal(await frame.locator(".map-pin[data-point-id='real-poi-15']:not([hidden])").count(), 0);
assert.equal(await frame.locator(".map-pin[data-point-id='real-poi-22']:not([hidden])").count(), 0);

await frame.locator("body").evaluate(() => window.__hongtangCesium.selectPoint("water-node-reservoir"));
await page.locator(".map-selection-bubble .water-spatial-detail h2").getByText("山箐水源", { exact: true }).waitFor({ timeout: 30000 });
await frame.locator(".map-pin[data-point-id='water-node-reservoir'].is-related").waitFor();
await page.screenshot({ path: resolve(outputDir, "water-topic-3d-supply.png"), fullPage: false });
await page.getByRole("button", { name: "退出水专题", exact: true }).click();
await page.locator(".gaussian-home[data-water-topic-mode='off']").waitFor();
await topicLauncher.waitFor({ state: "visible" });
await frame.locator("body[data-water-topic-mode='off']").waitFor();
assert.equal(await sharedFilter.getAttribute("data-qa-instance"), "kept-across-view-switch");
assert.equal(await researchLayer.isChecked(), false);
assert.equal(await frame.locator(".map-pin.map-dot:not([hidden])").count(), 0);
await page.screenshot({ path: resolve(outputDir, "shared-filter-3d.png"), fullPage: false });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseURL, { waitUntil: "domcontentloaded" });
await page.locator(".home-experience[data-home-map-mode='2d']").waitFor();
await page.getByRole("button", { name: /^专题/ }).click();
await page.getByRole("button", { name: "进入村里用水专题", exact: true }).click();
await page.locator(".map-explorer[data-water-topic-mode='overview']").waitFor();
await page.getByRole("button", { name: "饮水从哪来", exact: true }).click();
const mobilePanel = page.locator(".water-topic-navigator");
const mobilePanelBox = await mobilePanel.boundingBox();
assert(mobilePanelBox && mobilePanelBox.x >= 0 && mobilePanelBox.x + mobilePanelBox.width <= 390);
assert.equal(await page.getByRole("button", { name: "水系统全貌", exact: true }).isVisible(), true);
assert.equal(await page.getByRole("button", { name: "排水到哪里", exact: true }).isVisible(), true);
await page.screenshot({ path: resolve(outputDir, "water-topic-mobile.png"), fullPage: false });

await browser.close();

const relevantFailures = failedResponses.filter(({ url }) => !url.endsWith("/favicon.ico") && !url.startsWith("https://api.cesium.com/"));
if (consoleErrors.length && relevantFailures.length) {
  console.error(JSON.stringify({ consoleErrors, failedResponses: relevantFailures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "passed", screenshots: ["map-2d-free-pan.png", "shared-filter-3d.png", "water-topic-2d-supply.png", "water-topic-2d-drainage.png", "water-topic-3d-supply.png", "water-topic-mobile.png"] }, null, 2));
}
