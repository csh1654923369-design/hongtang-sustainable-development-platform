import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const baseURL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const edgePath = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const bridgeURL = "https://devxrszyvoocerobdfhz.supabase.co/functions/v1/geolibre-bridge?format=project";
const outputDir = resolve(process.env.QA_OUTPUT ?? ".qa");
mkdirSync(outputDir, { recursive: true });

const bridgeResponse = await fetch(bridgeURL);
if (!bridgeResponse.ok) {
  throw new Error(`GeoLibre bridge returned ${bridgeResponse.status}: ${await bridgeResponse.text()}`);
}
assert.match(bridgeResponse.headers.get("access-control-allow-origin") ?? "", /\*/);

const project = await bridgeResponse.json();
assert.equal(project.version, "0.1.0");
assert.equal(project.name, "红塘村空间数据实验项目");
assert.equal(project.metadata.bridgeMode, "read-only");
assert.deepEqual(project.mapView.center, [99.908740607, 24.636255278]);

const expectedLayerCounts = {
  "water-system-zones": 3,
  "water-system-lines": 8,
  "water-system-nodes": 7,
  "garden-points": 35,
  "tea-points": 9,
  "water-facility-points": 2,
  "public-service-points": 9,
  "village-record-points": 149,
};
for (const [layerId, expectedCount] of Object.entries(expectedLayerCounts)) {
  const layer = project.layers.find((item) => item.id === layerId);
  assert(layer, `Missing GeoLibre layer: ${layerId}`);
  assert.equal(layer.geojson.features.length, expectedCount, layerId);
}

const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: "zh-CN",
});
const page = await context.newPage();
const mapResponses = [];
const diagnostics = [];
page.on("response", (response) => {
  if (response.url().includes("geolibre-bridge")) {
    diagnostics.push(`bridge response ${response.status()}: ${response.url()}`);
  }
  if (response.url().includes("tiles.openfreemap.org")) {
    mapResponses.push({ url: response.url(), status: response.status() });
  }
});
page.on("requestfailed", (request) => {
  if (request.url().includes("geolibre-bridge")) {
    diagnostics.push(`bridge failure: ${request.failure()?.errorText ?? "unknown"}`);
  }
});
page.on("console", (message) => {
  if (message.type() === "error") diagnostics.push(`console: ${message.text()}`);
});
await page.goto(`${baseURL}/geolibre-lab`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: "GeoLibre 空间数据实验室" }).waitFor();
await page.getByText("每次打开都会读取 Supabase 最新数据", { exact: false }).waitFor();
assert.equal(await page.getByRole("link", { name: "新窗口打开", exact: true }).count(), 0);

const frame = page.locator("iframe[title='红塘村 GeoLibre 空间数据实验室']");
await frame.waitFor();
const frameSrc = await frame.getAttribute("src");
assert(frameSrc?.startsWith("/geolibre/index.html?"));
assert(frameSrc?.includes(encodeURIComponent(bridgeURL)));
assert(frameSrc?.includes("layout=compact"));

const geoLibreFrame = page.frames().find((item) => item.url().includes("/geolibre/index.html"));
assert(geoLibreFrame, "Self-hosted GeoLibre frame should be available");
const mapCanvas = geoLibreFrame.locator("canvas.maplibregl-canvas").first();
await mapCanvas.waitFor({ timeout: 30000 });
const mapCanvasBox = await mapCanvas.boundingBox();
assert(mapCanvasBox && mapCanvasBox.width > 500 && mapCanvasBox.height > 400, "GeoLibre map canvas should fill the workspace");
const zoomButtons = geoLibreFrame.getByRole("button", { name: "缩放至图层", exact: true });
try {
  await zoomButtons.first().waitFor({ timeout: 45000 });
} catch (error) {
  await page.screenshot({ path: resolve(outputDir, "geolibre-lab-failure.png"), fullPage: false });
  throw new Error(`${error instanceof Error ? error.message : String(error)}\n${diagnostics.join("\n")}`);
}
assert.equal(await zoomButtons.count(), 8);
await zoomButtons.nth(4).click();
for (let attempt = 0; attempt < 12 && !mapResponses.some((item) => item.status === 200); attempt += 1) {
  await page.waitForTimeout(1000);
}
assert(mapResponses.some((item) => item.status === 200), "GeoLibre basemap should load successfully");
await page.waitForTimeout(2500);
await page.screenshot({
  path: resolve(outputDir, "geolibre-lab-1440.png"),
  fullPage: false,
});
await browser.close();
console.log(JSON.stringify({
  status: "passed",
  bridgeMode: project.metadata.bridgeMode,
  layerCounts: expectedLayerCounts,
  mapCanvas: mapCanvasBox,
  successfulMapResponses: mapResponses.filter((item) => item.status === 200).length,
  screenshot: "geolibre-lab-1440.png",
}, null, 2));
