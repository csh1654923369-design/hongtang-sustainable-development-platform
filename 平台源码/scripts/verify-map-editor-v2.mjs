import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseURL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const edgePath = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
const page = await context.newPage();
const databaseWrites = [];
context.on("request", (request) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) && /platform_datasets|supabase/.test(request.url())) {
    databaseWrites.push({ method: request.method(), url: request.url() });
  }
});

async function openReadyEditor(targetPage) {
  await targetPage.goto(`${baseURL}/map-editor`, { waitUntil: "domcontentloaded" });
  await targetPage.locator(".map-data-editor-v2").waitFor();
  await targetPage.locator('.map-data-editor-v2[data-data-status="ready"]').waitFor();
  await targetPage.locator(".map-editor-map-shell").waitFor();
}

async function assertNoHorizontalOverflow(targetPage, stage) {
  const metrics = await targetPage.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  const widest = Math.max(metrics.documentWidth, metrics.bodyWidth);
  assert(
    widest <= metrics.innerWidth + 1,
    `${stage}不应产生横向溢出：内容宽度 ${widest}px，视口宽度 ${metrics.innerWidth}px`,
  );
}

async function assertEventually(targetPage, predicate, timeout = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await predicate()) return;
    await targetPage.waitForTimeout(50);
  }
  assert.fail(`等待界面状态超时（${timeout}ms）`);
}

async function assertMobilePanelState(targetPage, expected) {
  const editor = targetPage.locator(".map-data-editor-v2");
  await assertEventually(targetPage, async () => (await editor.getAttribute("data-mobile-panel")) === expected);
  const state = await targetPage.evaluate(() => ({
    sidebarOpen: document.querySelector(".map-editor-sidebar")?.classList.contains("mobile-open") ?? false,
    propertiesOpen: document.querySelector(".map-editor-properties")?.classList.contains("mobile-open") ?? false,
    backdropCount: document.querySelectorAll(".map-editor-mobile-backdrop").length,
  }));
  assert.equal(state.sidebarOpen, expected === "layers", `面板状态为 ${expected} 时图层抽屉状态不正确`);
  assert.equal(state.propertiesOpen, expected === "properties", `面板状态为 ${expected} 时属性抽屉状态不正确`);
  assert.equal(Number(state.sidebarOpen) + Number(state.propertiesOpen) <= 1, true, "图层和属性抽屉不得同时打开");
  assert.equal(state.backdropCount, expected === "none" ? 0 : 1, "抽屉遮罩应与面板开关状态一致");
}

function intersectionArea(first, second) {
  const width = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x));
  const height = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));
  return width * height;
}

try {
  await openReadyEditor(page);
  await page.locator(".map-editor-topic-group").first().waitFor();

  const topicNames = await page.locator(".map-editor-topic-toggle strong").allTextContents();
  assert.deepEqual(topicNames, ["小花园", "茶产业", "村里用水", "塌方与安全", "历史与文化"]);
  assert.equal(await page.locator(".map-editor-tool-rail").count(), 1);
  assert.equal(await page.locator(".map-editor-tool-rail-title").textContent(), "工具栏");
  assert.equal(await page.locator(".map-editor-toolbar").count(), 0, "不应保留悬浮于地图上方的旧工具栏");

  const gardenLayers = page.locator('[data-topic-id="garden"] [data-layer-id]');
  assert.equal(await gardenLayers.count(), 1, "小花园只保留位置点图层");
  assert.equal(await page.locator('[data-topic-id="garden"] [data-layer-id="garden-sites"]').count(), 1);
  const gardenGeometryTitles = await page.locator('[data-topic-id="garden"] .map-editor-layer-add').evaluateAll((buttons) => buttons.map((button) => button.getAttribute("title")));
  assert(gardenGeometryTitles.length > 0);
  assert(gardenGeometryTitles.every((title) => title?.includes("点要素")));

  await page.locator('[data-topic-id="safety"] .map-editor-topic-toggle').click();
  const safetyGeometryTitles = await page.locator('[data-topic-id="safety"] .map-editor-layer-add').evaluateAll((buttons) => buttons.map((button) => button.getAttribute("title")));
  assert(safetyGeometryTitles.length > 0);
  assert(safetyGeometryTitles.every((title) => title?.includes("点要素")));
  assert(safetyGeometryTitles.every((title) => !title?.includes("线要素") && !title?.includes("面要素")));

  await page.locator('[data-topic-id="water"] .map-editor-topic-toggle').click();
  const waterGeometryTitles = await page.locator('[data-topic-id="water"] .map-editor-layer-add').evaluateAll((buttons) => buttons.map((button) => button.getAttribute("title")));
  assert(waterGeometryTitles.some((title) => title?.includes("点要素")));
  assert(waterGeometryTitles.some((title) => title?.includes("线要素")));
  assert(waterGeometryTitles.some((title) => title?.includes("面要素")));

  const safetyLayer = page.locator('[data-layer-id="safety-risk-sites"]');
  const safetyItems = safetyLayer.locator('.map-editor-layer-items button');
  if (!(await safetyItems.count())) await safetyLayer.locator('.map-editor-layer-main').click();
  await safetyItems.first().click();
  await page.locator(".map-editor-properties-section label").filter({ hasText: /^隐患类型/ }).locator("select").waitFor();
  assert.equal(await page.locator(".map-editor-properties-section label").filter({ hasText: /^茶树品种/ }).count(), 0);

  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await openReadyEditor(mobilePage);
  const mobileEditor = mobilePage.locator(".map-data-editor-v2");
  const mobileNav = mobilePage.locator('.map-editor-mobile-nav[aria-label="打开编辑面板"]');
  const mobileLayersButton = mobileNav.getByRole("button", { name: "图层", exact: true });
  const mobilePropertiesButton = mobileNav.getByRole("button", { name: "属性", exact: true });
  await mobileLayersButton.waitFor();
  await mobilePropertiesButton.waitFor();
  await assertMobilePanelState(mobilePage, "none");
  await assertNoHorizontalOverflow(mobilePage, "390px 手机初始状态");

  await mobileLayersButton.click();
  await assertMobilePanelState(mobilePage, "layers");
  await mobilePage.waitForTimeout(240);
  await assertNoHorizontalOverflow(mobilePage, "390px 手机图层抽屉打开后");
  const mobileLayerBox = await mobilePage.locator(".map-editor-sidebar.mobile-open").boundingBox();
  assert(mobileLayerBox, "手机端图层抽屉应可见");
  assert(mobileLayerBox.x >= -1 && mobileLayerBox.x + mobileLayerBox.width <= 391, "手机端图层抽屉应完整位于视口内");

  await mobilePropertiesButton.click();
  await assertMobilePanelState(mobilePage, "properties");
  await mobilePage.waitForTimeout(240);
  await assertNoHorizontalOverflow(mobilePage, "390px 手机属性抽屉打开后");
  const mobilePropertiesBox = await mobilePage.locator(".map-editor-properties.mobile-open").boundingBox();
  assert(mobilePropertiesBox, "手机端属性抽屉应可见");
  assert(mobilePropertiesBox.x >= -1 && mobilePropertiesBox.x + mobilePropertiesBox.width <= 391, "手机端属性抽屉应完整位于视口内");

  await mobilePropertiesButton.click();
  await assertMobilePanelState(mobilePage, "none");
  await mobileLayersButton.click();
  await assertMobilePanelState(mobilePage, "layers");
  const mobileGardenItem = mobilePage.locator('[data-topic-id="garden"] [data-layer-id="garden-sites"] .map-editor-layer-items button').first();
  await mobileGardenItem.click();
  await assertMobilePanelState(mobilePage, "properties");
  await mobilePage.getByRole("button", { name: "关闭属性面板" }).click();
  await assertMobilePanelState(mobilePage, "none");
  await assertNoHorizontalOverflow(mobilePage, "390px 手机抽屉关闭后");
  const mobileMapBox = await mobilePage.locator(".map-editor-map-shell").boundingBox();
  assert(mobileMapBox && mobileMapBox.width > 200 && mobileMapBox.height > 200, "手机端关闭抽屉后地图应占据主要工作区");
  const mobileMapHit = await mobilePage.evaluate(({ x, y }) => {
    const hit = document.elementFromPoint(x, y);
    const mapShell = document.querySelector(".map-editor-map-shell");
    return { insideMap: Boolean(hit && mapShell?.contains(hit)), hitClass: hit instanceof HTMLElement ? hit.className : "" };
  }, { x: mobileMapBox.x + mobileMapBox.width * 0.45, y: mobileMapBox.y + mobileMapBox.height * 0.52 });
  assert(mobileMapHit.insideMap, "手机端关闭抽屉后点击应回到地图，实际命中：" + mobileMapHit.hitClass);
  assert.equal(await mobileEditor.getAttribute("data-mobile-panel"), "none");

  const tabletPage = await context.newPage();
  await tabletPage.setViewportSize({ width: 768, height: 900 });
  await openReadyEditor(tabletPage);
  const tabletMap = tabletPage.locator(".map-editor-map-shell");
  const tabletMapBefore = await tabletMap.boundingBox();
  assert(tabletMapBefore, "平板端地图应可见");
  const tabletGardenItem = tabletPage.locator('[data-topic-id="garden"] [data-layer-id="garden-sites"] .map-editor-layer-items button').first();
  await tabletGardenItem.click();
  await assertMobilePanelState(tabletPage, "properties");
  await tabletPage.waitForTimeout(240);
  const tabletMapAfter = await tabletMap.boundingBox();
  const tabletProperties = tabletPage.locator(".map-editor-properties.mobile-open");
  const tabletPropertiesBox = await tabletProperties.boundingBox();
  assert(tabletMapAfter && tabletPropertiesBox, "平板端地图和属性面板均应可见");
  assert(tabletMapAfter.width >= tabletMapBefore.width - 1, "平板端属性面板不得压缩地图：打开前 " + tabletMapBefore.width + "px，打开后 " + tabletMapAfter.width + "px");
  assert(intersectionArea(tabletMapAfter, tabletPropertiesBox) > 0, "平板端属性面板应覆盖在地图上方，而不是占用地图列宽");
  assert(tabletPropertiesBox.x >= -1 && tabletPropertiesBox.x + tabletPropertiesBox.width <= 769, "平板端属性面板应完整位于视口内");
  assert.equal(await tabletProperties.evaluate((element) => getComputedStyle(element).position), "absolute", "平板端属性面板应采用覆盖定位");
  await tabletProperties.locator(".map-editor-properties-section").first().waitFor();

  assert.equal(databaseWrites.length, 0);

  console.log(JSON.stringify({ status: "passed", topics: topicNames.length, gardenPointOnly: true, safetyPointOnly: true, waterPointLinePolygon: true, contextualFields: true, mobileDrawersExclusive: true, mobileNoHorizontalOverflow: true, mobileReturnsToMap: true, tabletPropertiesOverlay: true, tabletMapNotCompressed: true, databaseWrites: 0 }, null, 2));
} finally {
  await browser.close();
}
