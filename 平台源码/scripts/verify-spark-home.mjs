import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const baseURL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const edgePath =
  process.env.EDGE_PATH
  ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outputDir = resolve(process.env.QA_OUTPUT ?? ".qa");
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "zh-CN",
});
const page = await context.newPage();
const consoleErrors = [];
const failedResponses = [];
let modelResponseCount = 0;
let modelResponseBytes = 0;

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("response", async (response) => {
  if (response.status() >= 400) {
    failedResponses.push({ status: response.status(), url: response.url() });
  }
  if (!response.url().includes("/api/gaussian-model/")) return;
  modelResponseCount += 1;
  const length = Number(response.headers()["content-length"] ?? 0);
  if (Number.isFinite(length)) modelResponseBytes += length;
});

await page.goto(baseURL, { waitUntil: "domcontentloaded" });
const frame = page.frameLocator("#hongtang-gaussian-frame");
const html = frame.locator("html[data-spark-ready='true'][data-gaussian-point-count='5']");
try {
  await page.locator("[data-gaussian-state='ready']").waitFor({ timeout: 30000 });
  await html.waitFor({ timeout: 30000 });
} catch (error) {
  const debug = {
    parentState: await page.locator(".gaussian-home").getAttribute("data-gaussian-state"),
    frameDataset: await frame.locator("html").evaluate((element) => ({ ...element.dataset })),
    statusTitle: await frame.locator("#statusTitle").textContent(),
    statusText: await frame.locator("#statusText").textContent(),
    consoleErrors,
    failedResponses,
  };
  console.error(JSON.stringify(debug, null, 2));
  await page.screenshot({
    path: resolve(outputDir, "spark-formal-home-error.png"),
    fullPage: false,
  });
  await browser.close();
  throw error;
}
await page.waitForTimeout(8000);
await frame.locator("html[data-render-idle='true']").waitFor({ timeout: 15000 });

assert.equal(await html.getAttribute("data-viewer-engine"), "sparkjs");
assert.equal(await html.getAttribute("data-model-format"), "rad-chunked");
assert.equal(await html.getAttribute("data-request-render-mode"), "on-demand");
assert.equal(await html.getAttribute("data-gaussian-point-visible-count"), "5");
assert.equal(await html.getAttribute("data-lod-splat-count"), "350000");
assert.equal(await html.getAttribute("data-render-fps-cap"), "30");
assert(modelResponseCount > 1, "SparkJS should request the RAD index and visible chunks");
assert.equal(await frame.locator("canvas").count(), 1);
assert.equal(await frame.locator(".point-pin").count(), 5);

const idleFrameCountBefore = Number(await html.getAttribute("data-render-frame-count"));
await page.waitForTimeout(2000);
const idleFrameCountAfter = Number(await html.getAttribute("data-render-frame-count"));
assert(
  idleFrameCountAfter - idleFrameCountBefore <= 2,
  "SparkJS should stop continuous rendering when the camera and model are idle",
);

await page.evaluate(() => {
  document.querySelectorAll("nextjs-portal").forEach((element) => {
    element.style.display = "none";
  });
});
await page.screenshot({
  path: resolve(outputDir, "spark-formal-home-1440.png"),
  fullPage: false,
});

const result = {
  engine: await html.getAttribute("data-viewer-engine"),
  sparkVersion: await html.getAttribute("data-spark-version"),
  format: await html.getAttribute("data-model-format"),
  pointCount: await html.getAttribute("data-gaussian-point-count"),
  visiblePointCount: await html.getAttribute("data-gaussian-point-visible-count"),
  modelResponseCount,
  modelResponseMiB: Number((modelResponseBytes / 1024 / 1024).toFixed(2)),
  lodSplatCount: Number(await html.getAttribute("data-lod-splat-count")),
  activeSplats: Number(await html.getAttribute("data-active-splats")),
  fpsCap: Number(await html.getAttribute("data-render-fps-cap")),
  renderedFrames: idleFrameCountAfter,
  idleFrameDelta: idleFrameCountAfter - idleFrameCountBefore,
  consoleErrors,
};
console.log(JSON.stringify(result, null, 2));

await browser.close();
if (consoleErrors.length) process.exitCode = 1;
