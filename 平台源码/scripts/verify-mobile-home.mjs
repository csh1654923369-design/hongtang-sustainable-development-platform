import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const baseURL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const edgePath = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outputDir = resolve(process.env.QA_OUTPUT ?? ".qa");
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "zh-CN",
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

function insideViewport(box, width, height, inset = 0) {
  return box
    && box.x >= inset
    && box.y >= inset
    && box.x + box.width <= width - inset
    && box.y + box.height <= height - inset;
}

async function assertCompactHomeChrome(width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(180);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert(overflow <= 0, `${width}px viewport must not scroll horizontally`);

  const interfaceBox = await page.locator(".home-floating-interface").boundingBox();
  const brandBox = await page.locator(".home-floating-brand").boundingBox();
  const viewToggleBox = await page.locator(".home-view-toggle").boundingBox();
  const basemapBox = await page.locator(".home-basemap-control").boundingBox();
  const editorBox = await page.locator(".home-map-editor-entry").boundingBox();
  const topicBox = await page.locator(".home-topic-card").boundingBox();

  assert(interfaceBox && interfaceBox.height <= 100, `${width}px mobile controls should leave most of the map visible`);
  assert(brandBox && viewToggleBox && Math.abs(brandBox.y - viewToggleBox.y) <= 2, "brand and 2D/3D switch should share the first row");
  assert(basemapBox && editorBox && Math.abs(basemapBox.y - editorBox.y) <= 2, "basemap choices and editor entry should share the second row");
  assert(topicBox && topicBox.width <= 240, "collapsed topic launcher should stay compact on mobile");
  assert(topicBox.y >= interfaceBox.y + interfaceBox.height + 5, "topic launcher must not overlap the top controls");
  assert(insideViewport(brandBox, width, height));
  assert(insideViewport(viewToggleBox, width, height));
  assert(insideViewport(basemapBox, width, height));
  assert(insideViewport(editorBox, width, height));

  const controlFontSizes = await page.locator(".home-view-toggle button, .home-basemap-control button, .home-map-editor-entry-copy strong").evaluateAll(
    (elements) => elements.filter((element) => element.getBoundingClientRect().width > 0).map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  );
  assert(controlFontSizes.length >= 7 && controlFontSizes.every((fontSize) => fontSize >= 11), "mobile map controls should remain readable without zooming");
}

try {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.locator(".amap-village-map[data-map-provider='amap']").waitFor({ timeout: 25000 });

  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await assertCompactHomeChrome(viewport.width, viewport.height);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "手绘", exact: true }).click();
  await page.getByRole("button", { name: "底图", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "手绘", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.getByRole("button", { name: "底图", exact: true }).getAttribute("aria-pressed"), "true");

  const topicToggle = page.getByRole("button", { name: /^专题/ });
  await topicToggle.click();
  await page.waitForTimeout(240);
  const expandedTopicBox = await page.locator(".home-topic-card.open").boundingBox();
  assert(expandedTopicBox && expandedTopicBox.width >= 374, "expanded topic panel should use the mobile width");
  assert(expandedTopicBox.height <= 844 * 0.66, "expanded topic panel should not cover more than two thirds of the map");
  assert(insideViewport(expandedTopicBox, 390, 844, 8));
  await page.screenshot({ path: resolve(outputDir, "home-mobile-topics-390.png"), fullPage: false });
  await topicToggle.click();

  await page.getByRole("button", { name: "3D实景", exact: true }).click();
  await page.locator(".home-experience[data-rendered-home-map-mode='3d']").waitFor({ timeout: 30000 });
  assert.equal(await page.getByRole("button", { name: "3D实景", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator(".home-basemap-control").getAttribute("aria-hidden"), "true");
  await page.screenshot({ path: resolve(outputDir, "home-mobile-3d-390.png"), fullPage: false });

  await page.getByRole("button", { name: "2D地图", exact: true }).click();
  await page.locator(".home-experience[data-rendered-home-map-mode='2d']").waitFor({ timeout: 30000 });
  assert.equal(await page.getByRole("button", { name: "2D地图", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.getByRole("button", { name: "手绘", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.getByRole("button", { name: "底图", exact: true }).getAttribute("aria-pressed"), "true");

  const markerLayer = page.locator(".amap-react-marker-layer");
  await markerLayer.locator(".map-marker").first().waitFor({ timeout: 20000 });
  const markerTarget = await markerLayer.locator(".map-marker").evaluateAll((elements) => {
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x < 0 || y < 110 || x > innerWidth || y > innerHeight - 80) continue;
      if (document.elementFromPoint(x, y)?.closest(".map-marker") === element) return { x, y };
    }
    return null;
  });
  assert(markerTarget, "a visible map marker should remain tappable on mobile");
  await page.mouse.click(markerTarget.x, markerTarget.y);
  await page.locator(".map-selection-bubble").waitFor({ timeout: 3000 });
  const detailBox = await page.locator(".map-selection-bubble").boundingBox();
  assert(detailBox && detailBox.width >= 374, "mobile point details should use a readable bottom-card width");
  assert(detailBox.height <= 844 * 0.66, "mobile point details should keep part of the map visible");
  assert(insideViewport(detailBox, 390, 844, 8));

  const sceneTools = page.locator(".map-scene-tools");
  const sceneToolsBox = await sceneTools.boundingBox();
  assert(sceneToolsBox && sceneToolsBox.x + sceneToolsBox.width <= 382, "map tools must respect the right safe area");
  assert(sceneToolsBox && sceneToolsBox.y + sceneToolsBox.height <= 828, "map tools must respect the bottom safe area");

  await page.screenshot({ path: resolve(outputDir, "home-mobile-390.png"), fullPage: false });
  await page.keyboard.press("Escape");
  for (const viewport of [
    { width: 667, height: 375 },
    { width: 844, height: 390 },
    { width: 932, height: 430 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(420);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert(overflow <= 0, `${viewport.width}×${viewport.height} landscape must not scroll horizontally`);
    const landscapeToolsBox = await page.locator(".map-scene-tools").boundingBox();
    assert(insideViewport(landscapeToolsBox, viewport.width, viewport.height, 8), `map tools must stay inside ${viewport.width}×${viewport.height}`);

    const landscapeMarker = await markerLayer.locator(".map-marker").evaluateAll((elements) => {
      for (const element of elements) {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        if (x < 8 || y < 100 || x > innerWidth - 8 || y > innerHeight - 8) continue;
        if (document.elementFromPoint(x, y)?.closest(".map-marker") === element) return { x, y };
      }
      return null;
    });
    assert(landscapeMarker, `a marker should remain tappable at ${viewport.width}×${viewport.height}`);
    await page.mouse.click(landscapeMarker.x, landscapeMarker.y);
    await page.locator(".map-selection-bubble").waitFor({ timeout: 3000 });
    await page.waitForTimeout(360);
    const landscapeDetailBox = await page.locator(".map-selection-bubble").boundingBox();
    assert(insideViewport(landscapeDetailBox, viewport.width, viewport.height, 8), `detail card must stay inside ${viewport.width}×${viewport.height}`);
    await page.keyboard.press("Escape");
  }
  await page.screenshot({ path: resolve(outputDir, "home-landscape-932x430.png"), fullPage: false });
  console.log(JSON.stringify({
    status: "passed",
    viewports: [360, 390, 430],
    screenshots: ["home-mobile-390.png", "home-mobile-topics-390.png", "home-mobile-3d-390.png"],
  }, null, 2));
} finally {
  await browser.close();
}
