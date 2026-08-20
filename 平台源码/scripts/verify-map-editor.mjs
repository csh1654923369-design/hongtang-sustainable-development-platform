import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseURL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const edgePath = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
const home = await context.newPage();
const databaseWrites = [];
context.on("request", (request) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) && /platform_datasets|map-editor/.test(request.url())) {
    databaseWrites.push({ method: request.method(), url: request.url() });
  }
});

try {
  await home.goto(baseURL, { waitUntil: "domcontentloaded" });
  await home.locator(".home-experience[data-home-map-mode='2d']").waitFor();
  const originalTitle = await home.locator(".map-marker").first().getAttribute("title");
  assert(originalTitle);

  const [editor] = await Promise.all([
    home.waitForEvent("popup"),
    home.getByRole("link", { name: "进入红塘地图数据编辑", exact: true }).click(),
  ]);
  await editor.waitForURL(/\/map-editor$/);
  await editor.locator(".map-data-editor-v2").waitFor();
  const firstLayer = editor.locator('[data-layer-id="garden-sites"]');
  await firstLayer.waitFor();
  const firstItems = firstLayer.locator(".map-editor-layer-items button");
  if (!(await firstItems.count())) await firstLayer.locator(".map-editor-layer-main").click();
  await firstItems.first().click();
  const titleInput = editor.getByLabel("名称", { exact: true });
  await titleInput.waitFor();
  const undoButton = editor.getByRole("button", { name: "撤回", exact: true });
  const redoButton = editor.getByRole("button", { name: "恢复", exact: true });
  const historyActions = editor.locator(".map-editor-history-actions");
  assert.equal(await undoButton.isDisabled(), true);
  assert.equal(await redoButton.isDisabled(), true);
  assert.equal(await historyActions.getAttribute("data-history-limit"), "5");

  const temporaryTitle = `临时测试-${Date.now()}`;
  const historyTitles = Array.from({ length: 6 }, (_, index) => `${temporaryTitle}-${index + 1}`);
  for (const title of historyTitles) {
    await titleInput.fill(title);
    await titleInput.blur();
  }
  assert.equal(await historyActions.getAttribute("data-undo-depth"), "5", "历史记录只应保留最近5步");
  for (let index = 0; index < 5; index += 1) await undoButton.click();
  assert.equal(await titleInput.inputValue(), historyTitles[0]);
  assert.equal(await undoButton.isDisabled(), true, "第6步以前的历史应已被丢弃");
  assert.equal(await historyActions.getAttribute("data-redo-depth"), "5");
  for (let index = 0; index < 5; index += 1) await redoButton.click();
  assert.equal(await titleInput.inputValue(), historyTitles[5]);
  assert.equal(await redoButton.isDisabled(), true);

  await editor.getByRole("button", { name: "应用到平台", exact: true }).click();
  await editor.waitForTimeout(250);

  await home.locator(`.map-marker[title='${historyTitles[5]}']`).first().waitFor({ timeout: 10000 });
  await home.getByRole("button", { name: "3D实景", exact: true }).click();
  await home.locator(".gaussian-home[data-real-point-count]").waitFor();
  assert.equal(databaseWrites.length, 0, "临时编辑不得写入 Supabase 或任何数据接口");

  await home.reload({ waitUntil: "domcontentloaded" });
  await home.locator(".home-experience[data-home-map-mode='2d']").waitFor();
  await home.locator(`.map-marker[title='${originalTitle}']`).first().waitFor({ timeout: 15000 });
  assert.equal(await home.locator(`.map-marker[title='${historyTitles[5]}']`).count(), 0);
  assert.equal(databaseWrites.length, 0);

  console.log(JSON.stringify({
    status: "passed",
    editorRoute: "/map-editor",
    temporaryUpdateReached2dAnd3d: true,
    resetAfterRefresh: true,
    historyLimit: 5,
    undoRedoVerified: true,
    databaseWrites: databaseWrites.length,
  }, null, 2));
} finally {
  await browser.close();
}
