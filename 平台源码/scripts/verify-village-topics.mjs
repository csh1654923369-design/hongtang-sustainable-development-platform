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
  await page.route("**/rest/v1/platform_datasets*", async (route) => {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1200));
    await route.continue();
  });
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.locator(".home-experience[data-home-map-mode='2d']").waitFor();
  const topicLauncher = page.getByRole("button", { name: /^专题/ });
  const topicCard = page.locator(".home-topic-card");
  const topicPanel = page.locator("[data-shared-map-filter='persistent']");
  const basemapControl = page.locator(".home-basemap-control");
  assert.match(await topicLauncher.textContent(), /已选择5\/5个专题/);
  assert.equal(await page.locator(".map-empty-overlay").count(), 0);

  const settledMap = page.locator(".amap-village-map.amap-status-ready, .amap-village-map.amap-status-fallback");
  await settledMap.waitFor({ timeout: 30000 });
  const cloudReady = await settledMap.getAttribute("data-map-provider") === "amap";
  const markerRoot = cloudReady ? page.locator(".amap-react-marker-layer") : page.locator(".village-map");
  const twoDTool = page.getByRole("button", { name: "回到中心", exact: true });
  await twoDTool.waitFor();
  const twoDToolStyle = await twoDTool.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      width: style.width,
      height: style.height,
      borderRadius: style.borderRadius,
      backgroundColor: style.backgroundColor,
      color: style.color,
    };
  });
  assert.deepEqual(twoDToolStyle, {
    width: "44px",
    height: "44px",
    borderRadius: "13px",
    backgroundColor: "rgba(18, 30, 25, 0.88)",
    color: "rgb(247, 251, 248)",
  });
  assert.equal(await twoDTool.getAttribute("data-tooltip"), "回到中心");
  await twoDTool.hover();
  await page.waitForTimeout(250);
  assert.equal(await twoDTool.evaluate((element) => getComputedStyle(element, "::before").opacity), "1");
  await page.mouse.move(700, 450);

  assert.equal(await basemapControl.getAttribute("aria-hidden"), "false");
  assert.match(await basemapControl.getAttribute("class"), /\bopen\b/);
  const openBasemapMotion = await basemapControl.evaluate((element) => {
    const style = getComputedStyle(element);
    return { maxHeight: style.maxHeight, opacity: style.opacity, transitionProperty: style.transitionProperty };
  });
  assert.notEqual(openBasemapMotion.maxHeight, "0px");
  assert.equal(openBasemapMotion.opacity, "1");
  assert.match(openBasemapMotion.transitionProperty, /max-height/);

  const closedTopicMotion = await topicCard.evaluate((element) => {
    const panel = element.querySelector("[data-shared-map-filter='persistent']");
    return {
      cardTransition: getComputedStyle(element).transitionDuration,
      panelDisplay: panel ? getComputedStyle(panel).display : "missing",
      panelTransition: panel ? getComputedStyle(panel).transitionDuration : "missing",
    };
  });
  assert.equal(closedTopicMotion.cardTransition, "0s");
  assert.equal(closedTopicMotion.panelDisplay, "block");
  assert.match(closedTopicMotion.panelTransition, /0\.26s/);
  assert.deepEqual(
    await topicPanel.evaluate((element) => ({ maxHeight: getComputedStyle(element).maxHeight, opacity: getComputedStyle(element).opacity })),
    { maxHeight: "0px", opacity: "0" },
  );

  await topicLauncher.click();
  await topicPanel.waitFor({ state: "visible" });
  const openingTopicMotion = await topicPanel.evaluate((element) => ({
    animations: element.getAnimations().length,
    transitionProperty: getComputedStyle(element).transitionProperty,
  }));
  assert.ok(openingTopicMotion.animations > 0);
  assert.match(openingTopicMotion.transitionProperty, /max-height/);
  assert.match(openingTopicMotion.transitionProperty, /opacity/);
  await page.waitForTimeout(300);
  const openTopicMotion = await topicCard.evaluate((element) => {
    const panel = element.querySelector("[data-shared-map-filter='persistent']");
    return {
      panelDisplay: panel ? getComputedStyle(panel).display : "missing",
      panelOpacity: panel ? getComputedStyle(panel).opacity : "missing",
    };
  });
  assert.equal(openTopicMotion.panelDisplay, "block");
  assert.equal(openTopicMotion.panelOpacity, "1");
  assert.equal(
    await topicPanel.locator(".map-filter-panel").evaluate((element) => getComputedStyle(element).transform),
    "none",
  );
  assert.match(await topicLauncher.textContent(), /收起/);
  assert.equal(await topicPanel.locator(".filter-heading").count(), 0);
  assert.equal(await topicPanel.getByText("生态资源", { exact: true }).count(), 0);
  assert.equal(await topicPanel.locator(".village-topic-row").count(), 5);
  assert.equal(await topicPanel.getByText("光伏设施", { exact: true }).count(), 0);
  for (const topicId of ["garden", "tea", "water", "safety", "history"]) {
    assert.equal(await topicPanel.locator(`[data-topic-id='${topicId}']`).count(), 1);
  }
  await topicPanel.locator("[data-topic-id='garden']").getByText("35项", { exact: true }).waitFor();
  await topicPanel.locator("[data-topic-id='tea']").getByText("16项", { exact: true }).waitFor();
  await topicPanel.locator("[data-topic-id='safety']").getByText("5项", { exact: true }).waitFor();
  await topicPanel.locator("[data-topic-id='history']").getByText("6项", { exact: true }).waitFor();
  await markerRoot.locator("[data-marker-shape]").first().waitFor();
  const visiblePinCount = await markerRoot.locator("[data-marker-shape='pin']").count();
  const visibleDotCount = await markerRoot.locator("[data-marker-shape='dot']").count();
  assert(visiblePinCount > 0 && visiblePinCount <= 65, "decluttering should keep a useful subset of pin markers");
  assert(visibleDotCount > 0 && visibleDotCount <= 158, "decluttering should keep a useful subset of supporting dots");
  assert.equal(Number(await markerRoot.getAttribute("data-visible-marker-count")), visiblePinCount + visibleDotCount);
  for (const [type, count, color] of [
    ["public-service", 9, "rgb(78, 128, 160)"],
    ["research-photo", 149, "rgb(162, 103, 137)"],
  ]) {
    const markers = markerRoot.locator(`[data-feature-type='${type}'][data-marker-shape='dot']`);
    assert((await markers.count()) > 0 && (await markers.count()) <= count);
    assert.equal(await markers.first().evaluate((element) => getComputedStyle(element).color), color);
  }
  assert.equal(await markerRoot.locator("[data-feature-type='garden'][data-marker-shape='pin']").first().evaluate((element) => getComputedStyle(element).color), "rgb(79, 141, 85)");
  assert.equal(await markerRoot.locator("[data-feature-type='tea-factory'][data-marker-shape='pin']").first().evaluate((element) => getComputedStyle(element).color), "rgb(154, 113, 56)");
  assert.equal(await markerRoot.locator("[data-feature-type='water-facility'][data-marker-shape='pin']").first().evaluate((element) => getComputedStyle(element).color), "rgb(57, 117, 138)");
  assert.equal(await topicPanel.locator(".topic-layer-icon.topic-safety").evaluate((element) => getComputedStyle(element).backgroundColor), "rgb(182, 90, 67)");
  assert.equal(await topicPanel.locator(".topic-layer-icon.topic-history").evaluate((element) => getComputedStyle(element).backgroundColor), "rgb(123, 92, 142)");
  await page.screenshot({ path: resolve(outputDir, "village-topics-panel.png"), fullPage: false });

  await topicPanel.getByRole("button", { name: "进入小花园专题", exact: true }).click();
  await page.locator(".home-experience[data-active-village-topic='garden']").waitFor();
  await markerRoot.locator("[data-feature-type='garden']").first().waitFor();
  const visibleGardenCount = await markerRoot.locator("[data-feature-type='garden']").count();
  assert(visibleGardenCount > 0 && visibleGardenCount <= 35);
  assert.equal(await markerRoot.locator("[data-feature-type]:not([data-feature-type='garden'])").count(), 0);
  await page.getByText("已接入35项空间资料", { exact: true }).waitFor();

  await page.getByRole("button", { name: "3D实景", exact: true }).click();
  await page.locator(".gaussian-home[data-active-village-topic='garden']").waitFor();
  await page.waitForTimeout(260);
  assert.equal(await basemapControl.getAttribute("aria-hidden"), "true");
  assert.match(await basemapControl.getAttribute("class"), /\bcollapsed\b/);
  assert.deepEqual(
    await basemapControl.evaluate((element) => {
      const style = getComputedStyle(element);
      return { maxHeight: style.maxHeight, opacity: style.opacity };
    }),
    { maxHeight: "0px", opacity: "0" },
  );
  const frame = page.frameLocator("#hongtang-gaussian-frame");
  await frame.locator("body[data-selected-point-types]").waitFor({ timeout: 30000 });
  const threeDCenterTool = frame.getByRole("button", { name: "回到中心", exact: true });
  const threeDToolStyle = await threeDCenterTool.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      width: style.width,
      height: style.height,
      borderRadius: style.borderRadius,
      backgroundColor: style.backgroundColor,
      color: style.color,
    };
  });
  assert.deepEqual(threeDToolStyle, twoDToolStyle);
  assert.equal(await threeDCenterTool.getAttribute("data-tooltip"), "回到中心");
  await threeDCenterTool.hover();
  await page.waitForTimeout(250);
  assert.equal(await threeDCenterTool.evaluate((element) => getComputedStyle(element, "::before").opacity), "1");
  const groups = (await frame.locator("body").getAttribute("data-selected-point-types"))?.split(",") ?? [];
  assert.deepEqual(groups, ["garden"]);
  await page.getByRole("button", { name: "退出小花园专题", exact: true }).click();
  await topicLauncher.waitFor({ state: "visible" });
  await frame.locator("body[data-supporting-point-renderer='circle'][data-supporting-point-count='158']").waitFor();
  assert.equal(await frame.locator(".map-pin.map-dot[data-point-group='public']").count(), 9);
  assert.equal(await frame.locator(".map-pin.map-dot[data-point-group='ecology']").count(), 0);
  assert.equal(await frame.locator(".map-pin.map-dot[data-point-group='research']").count(), 149);
  assert.equal(await frame.locator(".map-pin.map-dot[data-point-group='garden']").count(), 0);

  await page.getByRole("button", { name: "2D地图", exact: true }).click();
  await page.waitForTimeout(260);
  assert.equal(await basemapControl.getAttribute("aria-hidden"), "false");
  assert.match(await basemapControl.getAttribute("class"), /\bopen\b/);
  assert.equal(await basemapControl.evaluate((element) => getComputedStyle(element).opacity), "1");
  await topicLauncher.click();
  await topicPanel.getByRole("button", { name: "进入塌方与安全专题", exact: true }).click();
  await page.locator(".home-experience[data-active-village-topic='safety']").waitFor();
  await page.locator("[data-feature-type='safety-risk']").first().waitFor();
  const selectedTopicPoint = markerRoot.locator("[data-feature-id='demo-safety-1']");
  await selectedTopicPoint.waitFor({ state: "visible" });
  await selectedTopicPoint.click();
  await page.locator(".map-selection-bubble").waitFor();
  await page.waitForTimeout(700);
  assert.equal(await markerRoot.locator(".map-marker.active[data-feature-id='demo-safety-1']").count(), 1, "selected topic point must remain rendered and active");
  await page.keyboard.press("Escape");
  await page.screenshot({ path: resolve(outputDir, "village-topic-safety-empty.png"), fullPage: false });
  await page.getByRole("button", { name: "退出塌方与安全专题", exact: true }).click();

  await topicLauncher.click();
  await topicPanel.getByRole("button", { name: "进入历史与文化专题", exact: true }).click();
  await page.locator(".home-experience[data-active-village-topic='history']").waitFor();
  if (cloudReady) await page.locator(".amap-spatial-accessibility [data-topic-spatial-id]").first().waitFor({ state: "attached" });
  await page.locator("[data-feature-type='village-memory'], [data-feature-type='culture']").first().waitFor();

  console.log(JSON.stringify({ status: "passed", topics: 5, initialSelection: "5/5", initialFalseEmptyState: false, gardenFeatures: 35, teaFeatures: 16, safetyFeatures: 5, historyFeatures: 6, solarTopic: false, topicTextMotion: "height-opacity-no-bounce", basemapTransition: true }, null, 2));
} finally {
  await browser.close();
}
