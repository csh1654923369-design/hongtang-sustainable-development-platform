import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const baseURL = process.env.DEMO_BASE_URL ?? "http://localhost:3100";
const edgePath = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outputDir = resolve(process.env.QA_OUTPUT ?? ".qa");
mkdirSync(outputDir, { recursive: true });

let serverProcess;

async function serverIsReady() {
  try {
    const response = await fetch(baseURL);
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await serverIsReady()) return;
  if (process.env.DEMO_BASE_URL) {
    throw new Error(`无法连接测试站点：${baseURL}`);
  }

  const nextBin = resolve("node_modules", "next", "dist", "bin", "next");
  const port = new URL(baseURL).port || "3100";
  serverProcess = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", port], {
    cwd: process.cwd(),
    stdio: "ignore",
    windowsHide: true,
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((done) => setTimeout(done, 500));
    if (await serverIsReady()) return;
    if (serverProcess.exitCode !== null) break;
  }
  throw new Error("本地 Next.js 服务未能在 30 秒内启动");
}

function stopServer() {
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill();
}

process.on("exit", stopServer);
await ensureServer();

const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const results = [];

async function setRole(page, roleText) {
  await page.locator(".role-trigger").first().click();
  await page.getByRole("option", { name: new RegExp(roleText) }).click();
}

async function run(name, task) {
  console.log(`[demo-smoke] ${name}`);
  try {
    await task();
    results.push({ name, status: "passed" });
    console.log(`[demo-smoke] passed: ${name}`);
  } catch (error) {
    results.push({ name, status: "failed", error: error instanceof Error ? error.message : String(error) });
    console.log(`[demo-smoke] failed: ${name}`);
  }
}

async function hideDevelopmentUi(targetPage) {
  await targetPage.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((element) => {
      element.style.display = "none";
    });
  });
}

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
const page = await desktop.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("net::ERR_CONNECTION_CLOSED")) {
    consoleErrors.push(message.text());
  }
});

await run("Cesium home loads the original ion model, world terrain and aerial imagery", async () => {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  const navigationLinks = page.locator(".topic-tab-inner > a");
  assert.equal(await navigationLinks.count(), 8);
  assert.equal(await navigationLinks.nth(0).textContent(), "首页");
  assert.equal(await navigationLinks.nth(1).textContent(), "村庄总览");

  const endpointResponse = await page.request.get(`${baseURL}/api/cesium-ion/asset`);
  assert(endpointResponse.ok());
  const endpoint = await endpointResponse.json();
  assert.equal(endpoint.assetId, 4908525);
  assert.equal(endpoint.type, "3DTILES");
  assert.equal(endpoint.environment?.terrain?.type, "TERRAIN");
  assert.equal(endpoint.environment?.imagery?.externalType, "BING");

  const iframe = page.locator("#hongtang-gaussian-frame");
  await iframe.waitFor();
  assert.equal(await iframe.getAttribute("src"), "/cesium-viewer/index.html?v=cesium-ion-v138");
  const cesiumFrame = page.frameLocator("#hongtang-gaussian-frame");
  const startupViewerBody = cesiumFrame.locator("body[data-cesium-ready='true'][data-model-ready='true'][data-terrain-ready='true'][data-local-imagery-ready='true'][data-world-imagery-ready='true'][data-initial-view-applied='true']");
  await startupViewerBody.waitFor({ timeout: 120000 });
  assert.equal(await startupViewerBody.getAttribute("data-resource-mode"), "cesium-ion");
  assert.equal(await startupViewerBody.getAttribute("data-ion-dependency"), "required");
  assert.equal(await startupViewerBody.getAttribute("data-default-camera-target"), "hongtang-village");
  assert.equal(await startupViewerBody.getAttribute("data-startup-camera-animation"), "disabled");
  assert.equal(await startupViewerBody.getAttribute("data-point-load-camera-action"), "keep-village-view");
  assert.equal(await startupViewerBody.getAttribute("data-default-view-range"), "1100");
  assert.equal(await startupViewerBody.getAttribute("data-last-camera-action"), "initial-village-set-view");
  const toolbar = cesiumFrame.locator(".scene-tools");
  assert.deepEqual(
    await toolbar.locator("button").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label"))),
    ["查看全部地点", "回到中心", "操作设置", "全屏查看"],
  );
  const homeModeSwitch = page.getByRole("group", { name: "切换首页地图模式" });
  assert.equal(await homeModeSwitch.getByRole("button", { name: "3D实景", exact: true }).getAttribute("aria-pressed"), "true");
  await homeModeSwitch.getByRole("button", { name: "2D地图", exact: true }).click();
  await page.locator(".home-experience[data-home-map-mode='2d'] [data-feature-id='real-poi-1']").waitFor({ timeout: 30000 });
  assert.equal(await page.locator("[data-feature-id='real-poi-1'] svg.lucide-flower2").count(), 1);
  assert.equal(await page.locator("[data-feature-id='real-poi-17'] svg.lucide-toilet").count(), 1);
  assert.equal(await page.locator("#hongtang-gaussian-frame").count(), 0);

  await navigationLinks.nth(1).click();
  await page.waitForURL(`${baseURL}/village-overview`);

  const heroImage = page.locator(".hero-aerial-card img");
  await heroImage.waitFor();
  const heroDimensions = await heroImage.evaluate((element) => ({ width: element.naturalWidth, height: element.naturalHeight }));
  assert.deepEqual(heroDimensions, { width: 3357, height: 3554 });
  await page.locator(".topic-tab-inner").getByRole("link", { name: "茶厂", exact: true }).click();
  await page.waitForURL(`${baseURL}/tea-factory`);
  await page.getByRole("heading", { name: "茶厂", exact: true }).waitFor();
});
await run("Cesium home creates every valid real point without village-boundary clipping", async () => {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.locator("[data-gaussian-state='ready'][data-real-point-count='205']").waitFor({ timeout: 120000 });
  const cesiumFrame = page.frameLocator("#hongtang-gaussian-frame");
  const viewerBody = cesiumFrame.locator("body[data-cesium-ready='true'][data-real-point-count='205']");
  await viewerBody.waitFor({ timeout: 120000 });
  assert.equal(await viewerBody.getAttribute("data-viewer-engine"), "cesiumjs");
  assert.equal(await viewerBody.getAttribute("data-cesium-version"), "1.143");
  assert.equal(await viewerBody.getAttribute("data-ready-status-visibility"), "hidden");
  assert.equal(
    await cesiumFrame.locator("#viewerStatus").evaluate((element) => getComputedStyle(element).display),
    "none",
  );
  assert.equal(await viewerBody.getAttribute("data-terrain-mode"), "cesium-world-terrain");
  assert.equal(await viewerBody.getAttribute("data-terrain-context"), "cesium-world-terrain");
  assert.equal(await viewerBody.getAttribute("data-visible-point-count"), "205");
  assert.equal(await cesiumFrame.locator("#pointCount").textContent(), "205个地点");
  assert.equal(await viewerBody.getAttribute("data-point-initialization-count"), "1");
  await cesiumFrame.locator("body[data-pin-renderer='html-svg'][data-research-point-renderer='circle'][data-research-point-count='149'][data-pin-grounded='true']").waitFor({ timeout: 120000 });
  assert.equal(await viewerBody.getAttribute("data-poi-pin-visual-size"), "38x47");
  assert.equal(await viewerBody.getAttribute("data-poi-pin-hit-area"), "42x52");
  const vectorPins = cesiumFrame.locator("#pointOverlay .map-pin");
  assert.equal(await vectorPins.count(), 205);
  assert.equal(await cesiumFrame.locator("#pointOverlay img").count(), 0);
  assert.equal(await cesiumFrame.locator("#pointOverlay svg .map-pin-shape").count(), 56);
  assert.equal(await cesiumFrame.locator("#pointOverlay .map-pin-character").count(), 0);
  assert.equal(await cesiumFrame.locator("#pointOverlay .map-pin-symbol").count(), 56);
  assert.equal(await cesiumFrame.locator(".map-pin[data-point-id='real-poi-1'][data-pin-symbol='flower']").count(), 1);
  assert.equal(await cesiumFrame.locator(".map-pin[data-point-id='real-poi-17'][data-pin-symbol='toilet']").count(), 1);
  assert.equal(await cesiumFrame.locator("#pointOverlay .map-dot .map-dot-core").count(), 149);
  assert.equal(await cesiumFrame.locator("#pointOverlay .map-dot svg").count(), 0);
  assert((await cesiumFrame.locator("#pointOverlay .map-pin:not([hidden])").count()) > 0);
  await page.waitForTimeout(3200);
  assert.equal(await viewerBody.getAttribute("data-point-initialization-count"), "1");

  const realDataResponse = await page.request.get(`${baseURL}/data/hongtang-real-map-features.json`);
  assert(realDataResponse.ok());
  const realData = await realDataResponse.json();
  assert.equal(realData.meta.poiCount, 56);
  assert.equal(realData.meta.villagePhotoPointCount, 149);
  assert.equal(realData.meta.poiImageCount + realData.meta.villageImageCount, 586);
  assert(realData.features.some((feature) => feature.latitude < realData.bounds.south));
});
await run("clicking a Cesium real point opens its coordinates and field photos", async () => {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.locator("[data-gaussian-state='ready']").waitFor({ timeout: 120000 });
  const cesiumFrame = page.frameLocator("#hongtang-gaussian-frame");
  const viewerBody = cesiumFrame.locator("body[data-real-point-count='205']");
  await viewerBody.waitFor({ timeout: 120000 });

  await viewerBody.evaluate(() => window.__hongtangCesium.focusPoint("real-poi-1"));
  await page.waitForTimeout(1100);
  const realPin = cesiumFrame.locator(".map-pin[data-point-id='real-poi-1']:not([hidden])");
  await realPin.waitFor({ timeout: 30000 });
  const realPinBox = await realPin.boundingBox();
  assert(realPinBox, "The focused SVG pin should be visible");
  await page.mouse.click(realPinBox.x + realPinBox.width / 2, realPinBox.y + realPinBox.height / 2);
  const pointBubble = page.locator(".gaussian-home-point-detail[data-point-anchor='true']");
  await pointBubble.locator("h2").getByText("古井边的花园(张国凤)", { exact: true }).waitFor();
  await page.locator(".detail-coordinates").filter({ hasText: "坐标：" }).first().waitFor();
  const bubbleScrollStyle = await pointBubble.locator(".map-detail").evaluate((element) => {
    const style = getComputedStyle(element);
    const trackStyle = getComputedStyle(element, "::-webkit-scrollbar-track");
    return {
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      scrollbarGutter: style.scrollbarGutter,
      edgeGap: style.getPropertyValue("--bubble-scrollbar-edge-gap").trim(),
      trackMarginBlockStart: trackStyle.marginBlockStart,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
  });
  assert(bubbleScrollStyle.scrollWidth <= bubbleScrollStyle.clientWidth);
  assert.equal(bubbleScrollStyle.overflowY, "auto");
  assert(bubbleScrollStyle.scrollbarGutter.includes("stable"));
  assert.equal(bubbleScrollStyle.edgeGap, "14px");
  assert.equal(bubbleScrollStyle.trackMarginBlockStart, "14px");
  assert(["left", "right"].includes(await pointBubble.getAttribute("data-bubble-side")));
  assert((await pointBubble.locator(".detail-image img").getAttribute("src"))?.includes("sannongdata.cn"));
  await cesiumFrame.locator("body[data-last-point-auto-focus='real-poi-1']").waitFor({ timeout: 30000 });
  assert.equal(await page.getByRole("button", { name: "定位到此处", exact: true }).count(), 0);
  assert.equal(await pointBubble.getByText(/^资料来源：/).count(), 0);
  await page.keyboard.press("Escape");
  await page.locator(".gaussian-home-point-detail").waitFor({ state: "detached" });
});
await run("Cesium mouse controls preserve orientation, pivot and horizontal plane", async () => {
  const vectorDistance = (left, right) => Math.hypot(...left.map((value, index) => value - right[index]));
  const positionDistance = (left, right) => vectorDistance(left.position, right.position);
  const orientationDistance = (left, right) => Math.max(
    vectorDistance(left.direction, right.direction),
    vectorDistance(left.up, right.up),
    vectorDistance(left.right, right.right),
  );
  const snapshotDistance = (left, right) => Math.max(positionDistance(left, right), orientationDistance(left, right));
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  const cesiumFrame = page.frameLocator("#hongtang-gaussian-frame");
  const viewerBody = cesiumFrame.locator("body[data-cesium-ready='true'][data-control-revision='world-space-v2']");
  await viewerBody.waitFor({ timeout: 120000 });
  await page.waitForTimeout(2600);
  const canvas = cesiumFrame.locator("#cesiumContainer canvas").first();
  const box = await canvas.boundingBox();
  assert(box, "Cesium canvas should be visible");
  const center = { x: box.x + box.width * .5, y: box.y + box.height * .5 };
  const snapshot = () => viewerBody.evaluate(() => window.__hongtangCesium.cameraSnapshot());

  const wheelBefore = await snapshot();
  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(240);
  const wheelAfter = await snapshot();
  assert(positionDistance(wheelBefore, wheelAfter) > .1);
  assert(orientationDistance(wheelBefore, wheelAfter) < 1e-10);
  assert(Number(await viewerBody.getAttribute("data-last-wheel-orientation-delta")) < 1e-10);
  await page.waitForTimeout(900);
  assert(snapshotDistance(wheelAfter, await snapshot()) < 1e-8);

  await page.mouse.move(center.x + 80, center.y + 40);
  const rightBefore = await snapshot();
  await page.mouse.down({ button: "right" });
  await page.waitForTimeout(80);
  assert(snapshotDistance(rightBefore, await snapshot()) < 1e-8);
  const upwardStart = Number(await viewerBody.getAttribute("data-orbit-start-elevation"));
  await page.mouse.move(center.x + 145, center.y - 5, { steps: 7 });
  const rightMoved = await snapshot();
  assert(positionDistance(rightBefore, rightMoved) > .1);
  assert(Number(await viewerBody.getAttribute("data-orbit-current-elevation")) < upwardStart);
  assert(Number(await viewerBody.getAttribute("data-orbit-center-error")) < 1e-8);
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(80);
  assert(snapshotDistance(rightMoved, await snapshot()) < 1e-8);

  await page.mouse.move(center.x + 40, center.y - 20);
  await page.mouse.down({ button: "right" });
  const downwardStart = Number(await viewerBody.getAttribute("data-orbit-start-elevation"));
  await page.mouse.move(center.x + 40, center.y + 55, { steps: 7 });
  assert(Number(await viewerBody.getAttribute("data-orbit-current-elevation")) > downwardStart);
  assert(Math.abs(Number(await viewerBody.getAttribute("data-last-orbit-yaw"))) < 1e-12);
  assert(Number(await viewerBody.getAttribute("data-orbit-center-error")) < 1e-8);
  await page.mouse.up({ button: "right" });

  await page.mouse.move(center.x, center.y - 120);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(center.x + 60, center.y - 120, { steps: 6 });
  await page.mouse.up({ button: "right" });
  const upperOrbitYaw = Number(await viewerBody.getAttribute("data-last-orbit-yaw"));
  await page.mouse.move(center.x, center.y + 120);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(center.x + 60, center.y + 120, { steps: 6 });
  await page.mouse.up({ button: "right" });
  const lowerOrbitYaw = Number(await viewerBody.getAttribute("data-last-orbit-yaw"));
  assert(upperOrbitYaw > 1e-4);
  assert(lowerOrbitYaw < -1e-4);
  assert(upperOrbitYaw * lowerOrbitYaw < 0);
  assert(Number(await viewerBody.getAttribute("data-orbit-center-error")) < 1e-8);

  await page.mouse.move(center.x - 90, center.y + 60);
  const panBefore = await snapshot();
  await page.mouse.down({ button: "left" });
  await page.mouse.move(center.x - 10, center.y + 95, { steps: 7 });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(120);
  const panAfter = await snapshot();
  assert(positionDistance(panBefore, panAfter) > .1);
  assert(orientationDistance(panBefore, panAfter) < 1e-10);
  assert(Number(await viewerBody.getAttribute("data-last-pan-vertical-delta")) < 1e-7);
  await page.waitForTimeout(900);
  assert(snapshotDistance(panAfter, await snapshot()) < 1e-8);
});
await run("six village matters have independent routes and page content", async () => {
  const topicPages = [
    ["/garden", "小花园", "四季变化", "garden", ["garden"], 35],
    ["/tea-factory", "茶厂", "收茶", "tea", ["tea-factory"], 9],
    ["/water", "村里用水", "维修反馈", "water", ["water-facility"], 2],
    ["/solar", "光伏设施", "信息公开", "solar", ["solar-facility"], 1],
    ["/safety", "安全隐患", "现场复查", "safety", ["safety-risk"], 1],
    ["/village-history", "村庄记忆", "村民讲述", "history", ["village-memory"], 1],
  ];
  for (const [route, heading, uniqueModule, topicId, expectedTypes, expectedCount] of topicPages) {
    await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
    const firstSection = page.locator("main.matter-page > section").first();
    assert.equal(await firstSection.getAttribute("data-topic-map"), topicId);
    await firstSection.locator(".map-handdrawn-image").waitFor();
    const markerTypes = await firstSection.locator("[data-feature-type]").evaluateAll((elements) => [...new Set(elements.map((element) => element.getAttribute("data-feature-type")))].sort());
    assert.deepEqual(markerTypes, [...expectedTypes].sort());
    assert.equal(await firstSection.locator("[data-feature-type]").count(), expectedCount);
    await page.locator("h1").filter({ hasText: heading }).waitFor();
    await page.getByRole("heading", { name: uniqueModule, exact: true }).waitFor();
  }
});

await run("real hand-drawn map and calibrated drone orthophoto both load", async () => {
  await page.goto(`${baseURL}/map`, { waitUntil: "networkidle" });
  const handdrawn = page.locator(".map-handdrawn-image");
  await handdrawn.waitFor();
  const handdrawnDimensions = await handdrawn.evaluate((element) => ({
    width: element instanceof HTMLImageElement ? element.naturalWidth : 0,
    height: element instanceof HTMLImageElement ? element.naturalHeight : 0,
  }));
  assert.deepEqual(handdrawnDimensions, { width: 2048, height: 2870 });
  await page.getByText("手绘底图 · 点位按经纬度定位", { exact: true }).waitFor();
  await page.locator("[data-feature-id='real-poi-1']").click();
  await page.getByRole("heading", { name: "古井边的花园(张国凤)", exact: true }).waitFor();
  await page.locator(".detail-coordinates").filter({ hasText: "坐标：" }).first().waitFor();
  assert((await page.locator(".map-detail .detail-image img").getAttribute("src"))?.includes("sannongdata.cn"));
  await page.getByRole("button", { name: "无人机影像", exact: true }).click();
  const aerial = page.locator(".map-aerial-image:not(.map-handdrawn-image)");
  await aerial.waitFor();
  const aerialDimensions = await aerial.evaluate((element) => ({
    width: element instanceof HTMLImageElement ? element.naturalWidth : 0,
    height: element instanceof HTMLImageElement ? element.naturalHeight : 0,
  }));
  assert.deepEqual(aerialDimensions, { width: 3357, height: 3554 });
  await page.getByText("0.3米展示版 · 点位按影像范围显示", { exact: true }).waitFor();
});

await run("village map groups concrete matters and opens their own pages", async () => {
  await page.goto(`${baseURL}/map`, { waitUntil: "networkidle" });
  const filterPanel = page.locator(".map-explorer > .map-filter-panel");
  for (const group of ["村里的具体事项", "行动与办理", "互助资源", "公共空间与调研资料"]) {
    await filterPanel.getByText(group, { exact: true }).waitFor();
  }
  for (const label of ["小花园", "茶场", "茶厂", "村里用水设施", "光伏设施", "安全隐患", "村庄记忆"]) {
    await filterPanel.getByText(label, { exact: true }).waitFor();
  }

  const layerCheckboxes = filterPanel.locator("input[data-layer-type]");
  for (let index = 0; index < await layerCheckboxes.count(); index += 1) {
    const checkbox = layerCheckboxes.nth(index);
    if (await checkbox.getAttribute("data-layer-type") !== "garden") await checkbox.uncheck();
  }
  const gardenMarker = page.locator("[data-feature-type='garden']");
  await gardenMarker.first().waitFor();
  assert.equal(await page.locator(".map-marker").count(), 35);
  await gardenMarker.first().click();
  await page.getByRole("heading", { name: "古井边的花园(张国凤)", exact: true }).waitFor();
  assert.equal(await page.locator(".map-detail").getByRole("link", { name: /查看详情/ }).getAttribute("href"), "/garden");
});

await run("all routes respond and render headings", async () => {
  const routes = [
    "/village-overview",
    "/village",
    "/village-life",
    "/garden",
    "/tea-factory",
    "/water",
    "/solar",
    "/safety",
    "/village-history",
    "/goals",
    "/goals/goal-livable",
    "/map",
    "/projects",
    "/projects/gateway-public-space",
    "/progress",
    "/participate",
    "/profile",
    "/research",
    "/admin",
    "/digital-twin",
    "/issues/issue-4",
    "/actions/new",
  ];
  for (const route of routes) {
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: route === "/" ? "domcontentloaded" : "networkidle" });
    assert(response?.ok(), `${route} returned ${response?.status()}`);
    if (route === "/") {
      await page.locator("#hongtang-gaussian-frame").waitFor();
      await page.frameLocator("#hongtang-gaussian-frame").locator("body[data-cesium-ready='true']").waitFor({ timeout: 90000 });
    } else await page.locator("h1, .access-gate h2").first().waitFor();
  }
});

await run("building survey map loads privacy-safe data and supports locating", async () => {
  await page.goto(`${baseURL}/map#building-survey`, { waitUntil: "networkidle" });
  const safeBuildingResponse = await page.request.get(`${baseURL}/data/hongtang-buildings-safe.geojson`);
  assert(safeBuildingResponse.ok());
  const safeBuildingText = await safeBuildingResponse.text();
  for (const forbiddenField of ["hzxm", "lxdh", "jtzz", "jtcy", "rkxx"]) assert(!safeBuildingText.includes(`"${forbiddenField}"`));
  assert.equal(JSON.parse(safeBuildingText).features.length, 1490);
  await page.locator("#building-survey").scrollIntoViewIfNeeded();
  await page.locator(".survey-building").first().waitFor();
  assert.equal(await page.locator(".survey-building").count(), 1490);
  await page.locator(".building-search input").fill("1446");
  await page.getByRole("button", { name: "定位", exact: true }).click();
  await page.getByRole("heading", { name: "建筑 #1446" }).waitFor();
  assert.equal(await page.locator(".survey-building").count(), 1490);
  await page.locator("#building-survey").screenshot({ path: resolve(outputDir, "building-survey-1440.png") });
});

await run("resident completes issue report and sees it in profile", async () => {
  await page.goto(`${baseURL}/report`, { waitUntil: "networkidle" });
  await setRole(page, "村民");
  await page.locator(".report-location-map .village-map").click({ position: { x: 360, y: 190 } });
  await page.getByRole("button", { name: /下一步/ }).click();
  await page.getByRole("button", { name: "道路通行" }).click();
  await page.getByRole("button", { name: /下一步/ }).click();
  await page.locator(".wizard-section input.text-input").fill("村巷雨后短时积水观察");
  await page.locator(".wizard-section textarea").fill("雨后经过该位置时发现短时积水，希望先安排现场观察并记录发生频率。");
  await page.getByRole("button", { name: /下一步/ }).click();
  await page.getByRole("button", { name: /下一步/ }).click();
  await page.getByRole("button", { name: /确认提交/ }).click();
  await page.getByRole("heading", { name: "上报成功" }).waitFor();
  const code = await page.locator(".report-success > strong").textContent();
  assert(code?.startsWith("HT-2026-"));
  await page.getByRole("link", { name: "前往个人中心" }).click();
  await page.getByText(code).first().waitFor();
});

await run("resident follows a project and submits a suggestion", async () => {
  await page.goto(`${baseURL}/projects/gateway-public-space`, { waitUntil: "networkidle" });
  await setRole(page, "村民");
  await page.getByRole("button", { name: "认领任务" }).first().click();
  await page.getByText("任务已加入我的参与意向").waitFor();
  await page.getByRole("button", { name: "关注项目" }).click();
  await page.getByRole("button", { name: "取消关注" }).waitFor();
  await page.locator(".project-participation textarea").fill("建议临时样段保留足够通行宽度，并观察不同时间段的使用情况。");
  await page.getByRole("button", { name: "提交建议" }).click();
  await page.getByText("建议已提交").waitFor();
});

await run("resident starts a micro action and administrator opens recruitment", async () => {
  await page.goto(`${baseURL}/actions/new`, { waitUntil: "networkidle" });
  await setRole(page, "村民");
  await page.getByLabel("行动名称").fill("短测");
  await page.getByLabel("简要说明").fill("试试");
  await page.getByLabel("希望发生的变化").fill("变好");
  await page.getByRole("button", { name: /下一步/ }).click();
  await page.getByTestId("micro-action-map").locator(".village-map").click({ position: { x: 510, y: 230 } });
  await page.getByLabel("地点名称").fill("点");
  await page.getByRole("button", { name: /下一步/ }).click();
  await page.getByLabel("已经具备什么？").fill("人");
  await page.getByLabel("还需要什么？").fill("物");
  await page.getByLabel("希望哪些伙伴加入？").fill("伙伴");
  await page.getByRole("button", { name: /下一步/ }).click();
  await page.getByLabel("第一次具体行动").fill("做");
  await page.getByLabel("维护或退出安排").fill("收");
  await page.locator(".action-wizard .check-row input").check();
  await page.getByRole("button", { name: /下一步/ }).click();
  await page.getByRole("button", { name: "确认提交" }).click();
  await page.getByTestId("micro-action-success").waitFor();
  await page.getByRole("link", { name: /我的行动/ }).click();
  await page.getByTestId("profile-tab-actions").click();
  await page.getByTestId("profile-micro-actions").getByText("短测", { exact: true }).waitFor();
  await setRole(page, "管理员");
  await page.locator(".app-header .button-admin").click();
  await page.getByRole("button", { name: /微行动核对/ }).click();
  await page.getByRole("button", { name: /短测/ }).click();
  await page.getByRole("button", { name: "通过并开放招募" }).click();
  await page.getByRole("button", { name: "保存更新" }).click();
  await page.getByText("微行动状态已更新").waitFor();
});

await run("community resource map protects privacy and records responses", async () => {
  await page.goto(`${baseURL}/map`, { waitUntil: "networkidle" });
  await setRole(page, "村民");
  await page.locator("[data-feature-type='resource-offer']").first().click();
  await page.getByText("为保护提供者隐私，具体位置将在匹配后确认。").waitFor();
  await page.getByRole("button", { name: "回应资源" }).click();
  await page.getByText("回应已记录").waitFor();
  await page.locator("#community-resources").scrollIntoViewIfNeeded();
  await page.locator("#community-resources").getByRole("button", { name: "正在寻找", exact: true }).click();
  assert.equal(await page.locator("#community-resources [data-resource-mode='need']").count(), 2);
  await page.locator("#community-resources [data-action='signal-resource-interest']").first().click();
});

await run("resident registers for activity and answers survey", async () => {
  await page.goto(`${baseURL}/participate`, { waitUntil: "networkidle" });
  await setRole(page, "村民");
  await page.getByRole("button", { name: /活动报名/ }).click();
  await page.getByRole("button", { name: "立即报名" }).first().click();
  await page.locator(".modal-card input[placeholder='请输入联系电话']").fill("13800000000");
  await page.getByRole("button", { name: "确认报名" }).click();
  await page.getByRole("button", { name: /调查问卷/ }).click();
  await page.locator(".survey-card input[type='radio']").first().check();
  await page.getByRole("button", { name: "提交问卷" }).first().click();
  await page.getByText("已提交，以上为模拟统计结果").waitFor();
});

await run("administrator accepts and assigns an issue", async () => {
  await page.goto(`${baseURL}/admin`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /切换为管理员并进入/ }).click();
  await page.getByRole("button", { name: /问题上报/ }).click();
  await page.locator(".admin-issue-list button").first().click();
  await page.locator(".issue-processor select").first().selectOption("processing");
  await page.locator(".issue-processor select").nth(1).selectOption({ label: "设施维护人员" });
  await page.locator(".issue-processor textarea").fill("已完成现场核对，安排维护人员继续处理并回传结果。");
  await page.getByRole("button", { name: "保存办理更新" }).click();
  await page.getByText("办理状态已更新").waitFor();
});

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: "zh-CN" });
const mobilePage = await mobile.newPage();
await run("390px mobile layout has no horizontal overflow", async () => {
  for (const route of ["/", "/village-overview", "/garden", "/tea-factory", "/water", "/solar", "/safety", "/village-history", "/map", "/village", "/participate", "/projects", "/progress"]) {
    await mobilePage.goto(`${baseURL}${route}`, { waitUntil: route === "/" ? "domcontentloaded" : "networkidle" });
    const dimensions = await mobilePage.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    assert(dimensions.scrollWidth <= dimensions.innerWidth + 1, `${route} overflows: ${dimensions.scrollWidth} > ${dimensions.innerWidth}`);
  }
  await mobilePage.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
  await mobilePage.locator("[data-gaussian-state='ready']").waitFor({ timeout: 120000 });
  await hideDevelopmentUi(mobilePage);
  const mobileCesiumFrame = mobilePage.frameLocator("#hongtang-gaussian-frame");
  const mobileViewerBody = mobileCesiumFrame.locator("body[data-cesium-ready='true'][data-real-point-count='205']");
  await mobileViewerBody.waitFor({ timeout: 120000 });
  await mobileViewerBody.evaluate(() => window.__hongtangCesium.selectPoint("real-poi-1"));
  const mobileDetail = mobilePage.locator(".gaussian-home-point-detail");
  await mobileDetail.waitFor();
  const mobileDetailLayout = await mobileDetail.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      position: style.position,
      side: element.getAttribute("data-bubble-side"),
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  assert.equal(mobileDetailLayout.position, "absolute");
  assert(["left", "right"].includes(mobileDetailLayout.side));
  assert(mobileDetailLayout.left >= 0 && mobileDetailLayout.top >= 0);
  assert(mobileDetailLayout.right <= mobileDetailLayout.viewportWidth + 1);
  assert(mobileDetailLayout.bottom <= mobileDetailLayout.viewportHeight + 1);
  assert(mobileDetailLayout.scrollWidth <= mobileDetailLayout.clientWidth + 1);
  await mobilePage.screenshot({ path: resolve(outputDir, "home-390.png"), fullPage: false });
  await mobilePage.goto(`${baseURL}/map`, { waitUntil: "networkidle" });
  await mobilePage.getByRole("button", { name: "无人机影像", exact: true }).click();
  await mobilePage.locator(".map-aerial-image").waitFor();
  await hideDevelopmentUi(mobilePage);
  await mobilePage.screenshot({ path: resolve(outputDir, "map-aerial-390.png"), fullPage: false });
});
await run("capture current Cesium terrain and real-point screenshots", async () => {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.locator("[data-gaussian-state='ready']").waitFor({ timeout: 120000 });
  const cesiumFrame = page.frameLocator("#hongtang-gaussian-frame");
  const viewerBody = cesiumFrame.locator("body[data-cesium-ready='true'][data-real-point-count='205']");
  await viewerBody.waitFor({ timeout: 120000 });
  const toolbar = cesiumFrame.locator(".scene-tools");
  await toolbar.waitFor();
  assert.equal((await toolbar.locator("button").all()).length, 4);
  assert.equal(await viewerBody.getAttribute("data-left-drag-action"), "horizontal-pan");
  assert.equal(await viewerBody.getAttribute("data-right-drag-action"), "orbit-screen-center-relative");
  assert.equal(await viewerBody.getAttribute("data-wheel-action"), "fixed-ratio-zoom");
  assert.equal(await viewerBody.getAttribute("data-middle-drag-action"), "disabled");

  await cesiumFrame.getByRole("button", { name: "操作设置", exact: true }).click();
  for (const controlId of ["panSensitivity", "orbitSensitivity", "zoomSensitivity"]) {
    const control = cesiumFrame.locator(`#${controlId}`);
    assert.equal(await control.getAttribute("min"), "0.3");
    assert.equal(await control.getAttribute("max"), "2.0");
    assert.equal(await control.getAttribute("step"), "0.1");
    assert.equal(Number(await control.inputValue()), 1);
  }
  assert.equal(await cesiumFrame.locator("#panValue").textContent(), "1.0");
  assert.equal(await cesiumFrame.locator("#orbitValue").textContent(), "1.0");
  assert.equal(await cesiumFrame.locator("#zoomValue").textContent(), "1.0");
  assert.equal(await viewerBody.getAttribute("data-sensitivity-range"), "0.3-2.0");
  assert.equal(await viewerBody.getAttribute("data-zoom-sensitivity-legacy-scale"), "1.5");
  await cesiumFrame.locator("#panSensitivity").fill("1.4");
  await cesiumFrame.locator("#orbitSensitivity").fill("1.2");
  await cesiumFrame.locator("#zoomSensitivity").fill("1.8");
  await cesiumFrame.locator("#qualitySelect").selectOption("saving");
  assert.equal(await viewerBody.getAttribute("data-render-quality"), "saving");
  await cesiumFrame.locator("#qualitySelect").selectOption("balanced");
  assert.equal(await viewerBody.getAttribute("data-render-quality"), "balanced");

  await cesiumFrame.locator("#pointFilter").selectOption("garden");
  assert.equal(await viewerBody.getAttribute("data-visible-point-count"), "35");
  await cesiumFrame.locator("#pointFilter").selectOption("all");
  assert.equal(await viewerBody.getAttribute("data-visible-point-count"), "205");
  await viewerBody.evaluate(() => window.__hongtangCesium.selectPoint("real-poi-1"));
  await page.locator(".detail-coordinates").filter({ hasText: "坐标：" }).first().waitFor();
  await hideDevelopmentUi(page);
  await page.screenshot({ path: resolve(outputDir, "home-1440.png"), fullPage: false });
  await page.screenshot({ path: resolve(outputDir, "cesium-real-points-1440.png"), fullPage: false });

  await page.goto(`${baseURL}/village-overview`, { waitUntil: "networkidle" });
  await hideDevelopmentUi(page);
  await page.screenshot({ path: resolve(outputDir, "village-overview-1440.png"), fullPage: false });
  await page.locator(".home-hero").screenshot({ path: resolve(outputDir, "home-hero-1440.png") });
  await page.locator(".village-matters-home").screenshot({ path: resolve(outputDir, "home-topics-1440.png") });
  await page.goto(`${baseURL}/tea-factory`, { waitUntil: "networkidle" });
  await hideDevelopmentUi(page);
  await page.screenshot({ path: resolve(outputDir, "topic-tea-1440.png"), fullPage: false });
  await page.goto(`${baseURL}/map`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "无人机影像", exact: true }).click();
  await page.locator(".map-aerial-image").waitFor();
  await hideDevelopmentUi(page);
  await page.locator(".map-explorer").screenshot({ path: resolve(outputDir, "map-aerial-1440.png") });
});await desktop.close();
await mobile.close();
await browser.close();
stopServer();

if (consoleErrors.length) {
  results.push({ name: "browser console errors", status: "failed", error: consoleErrors.join(" | ") });
}

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.status === "failed")) process.exit(1);
