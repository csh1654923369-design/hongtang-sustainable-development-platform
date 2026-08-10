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
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: "zh-CN",
});
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await page.goto(baseURL, { waitUntil: "domcontentloaded" });
await page.locator(".amap-village-map[data-map-provider='amap']").waitFor({ timeout: 20000 });
const mapCanvas = page.locator(".amap-cloud-canvas");
const mapBox = await mapCanvas.boundingBox();
assert(mapBox, "2D map canvas should be visible");

const markerLayer = page.locator(".amap-react-marker-layer");
await markerLayer.locator(".map-marker").first().waitFor();

const firstMarkerStyle = await markerLayer.locator(".map-marker").first().evaluate((element) => ({
  left: element.style.left,
  top: element.style.top,
  transform: getComputedStyle(element).transform,
  transitionDuration: getComputedStyle(element).transitionDuration,
}));
assert(firstMarkerStyle.left.endsWith("px"));
assert(firstMarkerStyle.top.endsWith("px"));
assert.equal(firstMarkerStyle.transitionDuration, "0s");
assert.match(firstMarkerStyle.transform, /^matrix\(1, 0, 0, 1,/);

async function findTopmostMarker() {
  return markerLayer.locator(".map-marker").evaluateAll((elements) => {
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      const topElement = document.elementFromPoint(x, y);
      if (topElement?.closest(".map-marker") === element) {
        return { id: element.getAttribute("data-feature-id"), x, y };
      }
    }
    return null;
  });
}

const modes = ["航拍", "手绘", "卫星", "底图"];
let successfulClicks = 0;
for (const mode of modes) {
  await page.getByRole("button", { name: mode, exact: true }).click();
  await page.waitForTimeout(300);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const closeButton = page.getByRole("button", { name: "关闭点位详情", exact: true });
    if (await closeButton.count()) await closeButton.click();

    await page.mouse.move(mapBox.x + mapBox.width * 0.62, mapBox.y + mapBox.height * 0.62);
    await page.mouse.wheel(0, attempt % 2 === 0 ? -180 : 180);
    await page.waitForTimeout(320);

    const target = await findTopmostMarker();
    assert(target?.id, `A clickable marker should be available in ${mode}`);
    await page.mouse.click(target.x, target.y);
    await page.locator(".map-selection-bubble").waitFor({ timeout: 2500 });
    await page.waitForTimeout(650);
    assert.equal(await page.locator(".map-selection-bubble").isVisible(), true);
    assert.equal(await markerLayer.locator(`.map-marker.active[data-feature-id='${target.id}']`).count(), 1);
    successfulClicks += 1;
  }
}

await page.screenshot({ path: resolve(outputDir, "map-2d-marker-crispness.png"), fullPage: false });
await browser.close();

assert.equal(successfulClicks, 16);
assert.equal(consoleErrors.length, 0, JSON.stringify(consoleErrors, null, 2));
console.log(JSON.stringify({ status: "passed", successfulClicks, screenshot: "map-2d-marker-crispness.png" }, null, 2));
