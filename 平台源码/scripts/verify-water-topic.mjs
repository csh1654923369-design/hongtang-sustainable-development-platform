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
const brandBox = await page.locator(".home-floating-brand").boundingBox();
const mapControlsBox = await page.locator(".home-map-controls").boundingBox();
const viewToggleBox = await page.locator(".home-view-toggle").boundingBox();
const basemapControl = page.locator(".home-basemap-control");
const basemapBox = await basemapControl.boundingBox();
assert(brandBox && mapControlsBox && viewToggleBox && basemapBox);
assert(viewToggleBox.x > brandBox.x + brandBox.width);
assert(mapControlsBox.x + mapControlsBox.width > 1420);
assert(basemapBox.y >= viewToggleBox.y + viewToggleBox.height + 3);
assert.equal(await basemapControl.getByRole("button").count(), 4);
assert.equal(await basemapControl.getByRole("button", { name: "底图", exact: true }).count(), 1);
assert.equal(await basemapControl.evaluate((element) => element.parentElement?.classList.contains("home-map-controls")), true);
assert(Math.abs(basemapBox.x - viewToggleBox.x) < 1);
assert(Math.abs(basemapBox.width - viewToggleBox.width) < 1);
assert(mapControlsBox.width >= 250 && mapControlsBox.width <= 270);
assert.deepEqual(
  await basemapControl.getByRole("button").evaluateAll((buttons) => buttons.map((button) => button.textContent?.trim())),
  ["航拍", "手绘", "卫星", "底图"],
);
const basemapButtonBoxes = await basemapControl.getByRole("button").evaluateAll((buttons) => buttons.map((button) => {
  const box = button.getBoundingClientRect();
  return { x: box.x, y: box.y, width: box.width };
}));
assert(basemapButtonBoxes.every((box) => Math.abs(box.y - basemapButtonBoxes[0].y) < 1));
assert(basemapButtonBoxes.every((box, index) => index === 0 || box.x > basemapButtonBoxes[index - 1].x));
const imageryChoiceGroup = basemapControl.locator("[data-layer-choice-group='village-imagery']");
const cloudChoiceGroup = basemapControl.locator("[data-layer-choice-group='cloud-basemap']");
assert.equal(await imageryChoiceGroup.getByRole("button").count(), 2);
assert.equal(await cloudChoiceGroup.getByRole("button").count(), 2);
const [imageryGroupBox, cloudGroupBox] = await Promise.all([imageryChoiceGroup.boundingBox(), cloudChoiceGroup.boundingBox()]);
assert(imageryGroupBox && cloudGroupBox);
assert(Math.abs(imageryGroupBox.y - cloudGroupBox.y) < 1);
assert(cloudGroupBox.x > imageryGroupBox.x + imageryGroupBox.width);
assert.deepEqual(await basemapControl.locator(".map-layer-choice-group").evaluateAll((groups) => groups.map((group) => getComputedStyle(group).borderRadius)), ["9px", "9px"]);
assert.equal(await imageryChoiceGroup.getByRole("button", { name: "航拍", exact: true }).getAttribute("aria-pressed"), "true");
assert.equal(await cloudChoiceGroup.getByRole("button", { name: "卫星", exact: true }).getAttribute("aria-pressed"), "true");
await page.locator(".amap-village-map.amap-status-ready").waitFor({ timeout: 30000 });
await imageryChoiceGroup.getByRole("button", { name: "手绘", exact: true }).click();
await page.locator(".amap-village-map[data-overlay-mode='handdrawn'][data-base-layer-mode='satellite']").waitFor();
assert.equal(await imageryChoiceGroup.getByRole("button", { name: "手绘", exact: true }).getAttribute("aria-pressed"), "true");
assert.equal(await cloudChoiceGroup.getByRole("button", { name: "卫星", exact: true }).getAttribute("aria-pressed"), "true");
await page.waitForTimeout(4500);
await page.screenshot({ path: resolve(outputDir, "map-2d-handdrawn-satellite.png"), fullPage: false });
await imageryChoiceGroup.getByRole("button", { name: "航拍", exact: true }).click();
await page.locator(".amap-village-map[data-overlay-mode='aerial'][data-base-layer-mode='satellite']").waitFor();
assert.equal(await cloudChoiceGroup.getByRole("button", { name: "卫星", exact: true }).getAttribute("aria-pressed"), "true");
await cloudChoiceGroup.getByRole("button", { name: "底图", exact: true }).click();
await page.locator(".amap-village-map[data-overlay-mode='aerial'][data-base-layer-mode='base']").waitFor();
const mapStage = page.locator(".map-geographic-stage");
const mapFrame = page.locator(".map-geographic-frame");
const cloudMap = page.locator(".amap-village-map[data-map-provider='amap']");
const cloudMapReady = await cloudMap.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
const visibleMarkerRoot = cloudMapReady ? page.locator(".amap-react-marker-layer") : page.locator(".village-map");
if (cloudMapReady) {
  const twoDSceneTools = page.locator(".map-scene-tools .map-scene-tool");
  assert.equal(await twoDSceneTools.count(), 2);
  assert.deepEqual(await twoDSceneTools.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label"))), ["回到中心", "全屏查看"]);
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
  await page.getByRole("button", { name: "回到中心", exact: true }).click();
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
const topicCard = page.locator(".home-topic-card.open");
await topicCard.waitFor();
const topicCardBox = await topicCard.boundingBox();
const topicLauncherBox = await topicLauncher.boundingBox();
const sharedFilterBox = await sharedFilter.boundingBox();
assert(topicCardBox && topicLauncherBox && sharedFilterBox);
assert(Math.abs(brandBox.width - topicCardBox.width) < 1);
assert(Math.abs(topicLauncherBox.width - sharedFilterBox.width) < 1);
assert.equal(await topicLauncher.evaluate((element) => element.parentElement?.classList.contains("home-topic-card")), true);
assert.equal(await sharedFilter.evaluate((element) => element.parentElement?.classList.contains("home-topic-card")), true);
assert.match(await sharedFilter.evaluate((element) => getComputedStyle(element).transitionProperty), /max-height/);
assert.match(await sharedFilter.evaluate((element) => getComputedStyle(element).transitionProperty), /opacity/);
assert.match(await sharedFilter.evaluate((element) => getComputedStyle(element).transitionDuration), /0\.26s/);
await page.waitForTimeout(300);
assert.equal(await sharedFilter.evaluate((element) => getComputedStyle(element).opacity), "1");
assert.equal(await sharedFilter.evaluate((element) => getComputedStyle(element).transform), "none");
assert.match(await topicLauncher.textContent(), /收起/);
assert.equal(await sharedFilter.locator(".filter-heading").count(), 0);
assert.equal(await sharedFilter.getByText("生态资源", { exact: true }).count(), 0);
await sharedFilter.evaluate((element) => element.setAttribute("data-qa-instance", "kept-across-view-switch"));
const researchLayer = sharedFilter.locator("input[data-layer-type='research-photo']");
await researchLayer.uncheck();
assert.equal(await researchLayer.isChecked(), false);
const selected2dTypes = (await sharedFilter.getAttribute("data-selected-layer-types"))?.split(",") ?? [];
assert(!selected2dTypes.includes("research-photo"));
await topicLauncher.click();
await sharedFilter.waitFor({ state: "hidden" });
assert.match(await topicLauncher.textContent(), /展开/);

await page.getByRole("button", { name: "3D实景", exact: true }).click();
await page.locator(".home-experience[data-home-map-mode='3d']").waitFor();
const collapsedBasemapControl = page.locator(".home-basemap-control.collapsed");
await collapsedBasemapControl.waitFor({ state: "attached" });
assert.equal(await collapsedBasemapControl.getAttribute("aria-hidden"), "true");
assert.equal(await collapsedBasemapControl.evaluate((element) => getComputedStyle(element).pointerEvents), "none");
const sharedFrame = page.frameLocator("#hongtang-gaussian-frame");
await sharedFrame.locator("body[data-selected-point-types]").waitFor({ timeout: 30000 });
assert.equal(await sharedFrame.locator("#showAllButton").evaluate((element) => getComputedStyle(element).display), "none");
const settingsToolBox = await sharedFrame.locator("#settingsButton").boundingBox();
const centerToolBox = await sharedFrame.locator("#centerButton").boundingBox();
const fullscreenToolBox = await sharedFrame.locator("#fullscreenButton").boundingBox();
assert(settingsToolBox && centerToolBox && fullscreenToolBox);
assert(settingsToolBox.y < centerToolBox.y && centerToolBox.y < fullscreenToolBox.y);
const selected3dGroups = (await sharedFrame.locator("body").getAttribute("data-selected-point-types"))?.split(",") ?? [];
assert(!selected3dGroups.includes("research"));
assert.equal(await sharedFrame.locator("#pointFilterPanel").evaluate((element) => getComputedStyle(element).display), "none");
assert.equal(await sharedFilter.getAttribute("data-qa-instance"), "kept-across-view-switch");
assert.equal(await researchLayer.isChecked(), false);

await page.getByRole("button", { name: "2D地图", exact: true }).click();
await page.locator(".home-experience[data-home-map-mode='2d']").waitFor();
await page.locator(".home-basemap-control").waitFor();
assert.equal(await imageryChoiceGroup.getByRole("button", { name: "航拍", exact: true }).getAttribute("aria-pressed"), "true");
assert.equal(await cloudChoiceGroup.getByRole("button", { name: "底图", exact: true }).getAttribute("aria-pressed"), "true");
await page.locator(".amap-village-map.amap-status-ready").waitFor({ timeout: 30000 });
await imageryChoiceGroup.getByRole("button", { name: "手绘", exact: true }).click();
await page.locator(".amap-village-map[data-overlay-mode='handdrawn'][data-base-layer-mode='base']").waitFor();
await visibleMarkerRoot.locator(".map-marker").first().waitFor();
assert.equal(await sharedFilter.getAttribute("data-qa-instance"), "kept-across-view-switch");
assert.equal(await researchLayer.isChecked(), false);
assert.equal(await visibleMarkerRoot.locator(".map-marker.map-marker-dot").count(), 9);
const enterWaterTopicButton = sharedFilter.getByRole("button", { name: "进入村里用水专题", exact: true });
if (!await enterWaterTopicButton.isVisible()) await topicLauncher.click();
await enterWaterTopicButton.click();
await page.locator(".map-explorer[data-water-topic-mode='overview']").waitFor();
await page.getByRole("button", { name: "饮水从哪来", exact: true }).click();
await page.locator(".map-explorer[data-water-topic-mode='supply']").waitFor();
assert.equal(await imageryChoiceGroup.getByRole("button", { name: "手绘", exact: true }).getAttribute("aria-pressed"), "true");
assert.equal(await cloudChoiceGroup.getByRole("button", { name: "底图", exact: true }).getAttribute("aria-pressed"), "true");
assert.equal(await page.locator(".amap-village-map").getAttribute("data-overlay-mode"), "handdrawn");
assert.equal(await page.locator(".amap-village-map").getAttribute("data-base-layer-mode"), "base");

assert.equal(await visibleMarkerRoot.locator("[data-feature-id^='water-node-']").count(), 5);
assert.equal(await visibleMarkerRoot.locator("[data-feature-id='real-poi-15']").count(), 0);
assert.equal(await visibleMarkerRoot.locator("[data-feature-id='real-poi-22']").count(), 0);
assert.equal(await page.locator(".home-water-line").count(), 3);
assert.equal(await page.locator(".home-water-zone").count(), 3);
assert.equal(await page.locator(".home-topic-card").evaluate((element) => getComputedStyle(element).display), "none");

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
assert.equal(await imageryChoiceGroup.getByRole("button", { name: "手绘", exact: true }).getAttribute("aria-pressed"), "true");
assert.equal(await cloudChoiceGroup.getByRole("button", { name: "底图", exact: true }).getAttribute("aria-pressed"), "true");
assert.equal(await visibleMarkerRoot.locator("[data-feature-id^='water-node-']").count(), 2);
assert.equal(await visibleMarkerRoot.locator("[data-feature-id='real-poi-15']").count(), 1);
assert.equal(await visibleMarkerRoot.locator("[data-feature-id='real-poi-22']").count(), 1);
assert.equal(await page.locator(".home-water-line").count(), 4);
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
assert.equal(await viewerBody.getAttribute("data-spatial-depth-mode"), "terrain-and-3d-tiles");
assert.equal(Number(await viewerBody.getAttribute("data-spatial-zone-alpha")), 0.31);
assert(Number(await viewerBody.getAttribute("data-spatial-line-alpha")) >= 0.98);
assert.equal(await viewerBody.getAttribute("data-spatial-occlusion-compensation"), "screen-space-front-overlay");
assert.equal(await viewerBody.getAttribute("data-water-zone-count"), "3");
assert.equal(await viewerBody.getAttribute("data-spatial-overlay-zone-count"), "6");
await frame.locator(".spatial-zone-overlay:not([hidden])").first().waitFor({ timeout: 30000 });
assert.equal(await frame.locator(".spatial-zone-overlay:not([hidden])").count(), 3);
assert.equal(await frame.locator("#pointFilterPanel").evaluate((element) => getComputedStyle(element).display), "none");
assert(Number(await viewerBody.getAttribute("data-visible-point-count")) >= 11);
assert.equal(await frame.locator(".map-pin[data-point-id='real-poi-15']:not([hidden])").count(), 0);
assert.equal(await frame.locator(".map-pin[data-point-id='real-poi-22']:not([hidden])").count(), 0);

const zoneClickPosition = await frame
  .locator(".spatial-zone-overlay[data-spatial-id='water-zone-south']")
  .evaluate((path) => {
    const bounds = path.getBBox();
    const pins = Array.from(document.querySelectorAll(".map-pin:not([hidden])"))
      .map((pin) => pin.getBoundingClientRect());
    for (let row = 1; row <= 8; row += 1) {
      for (let column = 1; column <= 8; column += 1) {
        const x = bounds.x + (bounds.width * column) / 9;
        const y = bounds.y + (bounds.height * row) / 9;
        const point = new DOMPoint(x, y);
        const clearOfPins = pins.every((pin) => (
          Math.hypot(x - (pin.left + pin.width / 2), y - (pin.top + pin.height / 2)) > 70
        ));
        if (path.isPointInFill(point) && clearOfPins) return { x, y };
      }
    }
    return undefined;
  });
const frameBounds = await page.locator("#hongtang-gaussian-frame").boundingBox();
assert(zoneClickPosition && frameBounds);
await page.mouse.click(
  frameBounds.x + zoneClickPosition.x,
  frameBounds.y + zoneClickPosition.y,
);
await page.locator(".map-selection-bubble .water-spatial-detail h2").getByText("南片供水分区", { exact: true }).waitFor({ timeout: 30000 });
assert(Number(await frame.locator(".spatial-zone-overlay[data-spatial-id='water-zone-south']").getAttribute("fill-opacity")) >= 0.6);

await frame.locator("body").evaluate(() => window.__hongtangCesium.selectPoint("water-node-reservoir"));
await page.locator(".map-selection-bubble .water-spatial-detail h2").getByText("山箐水源", { exact: true }).waitFor({ timeout: 30000 });
await frame.locator(".map-pin[data-point-id='water-node-reservoir'].is-related").waitFor();
await page.screenshot({ path: resolve(outputDir, "water-topic-3d-supply.png"), fullPage: false });
await page.getByRole("button", { name: "退出水专题", exact: true }).click();
await page.locator(".gaussian-home[data-water-topic-mode='off']").waitFor();
await topicLauncher.waitFor({ state: "visible" });
await frame.locator("body[data-water-topic-mode='off']").waitFor();
const restoredVisibleZoneCount = await frame.locator(".spatial-zone-overlay:not([hidden])").count();
assert(restoredVisibleZoneCount > 0 && restoredVisibleZoneCount <= 6);
assert.equal(
  await frame.locator(".spatial-zone-overlay[hidden]").count() + restoredVisibleZoneCount,
  6,
);
assert.equal(await sharedFilter.getAttribute("data-qa-instance"), "kept-across-view-switch");
assert.equal(await researchLayer.isChecked(), false);
assert.equal(await frame.locator(".map-pin.map-dot[data-point-group='public']").count(), 9);
assert.equal(await frame.locator(".map-pin.map-dot[data-point-group='ecology']").count(), 0);
assert.equal(await frame.locator(".map-pin.map-dot[data-point-group='research']:not([hidden])").count(), 0);
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
  console.log(JSON.stringify({ status: "passed", screenshots: ["map-2d-handdrawn-satellite.png", "map-2d-free-pan.png", "shared-filter-3d.png", "water-topic-2d-supply.png", "water-topic-2d-drainage.png", "water-topic-3d-supply.png", "water-topic-mobile.png"] }, null, 2));
}
