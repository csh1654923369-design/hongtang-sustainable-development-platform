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

try {
  await page.goto(`${baseURL}/map-editor`, { waitUntil: "domcontentloaded" });
  await page.locator(".map-data-editor-v2").waitFor();
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
  assert.equal(databaseWrites.length, 0);

  console.log(JSON.stringify({ status: "passed", topics: topicNames.length, gardenPointOnly: true, safetyPointOnly: true, waterPointLinePolygon: true, contextualFields: true, databaseWrites: 0 }, null, 2));
} finally {
  await browser.close();
}
