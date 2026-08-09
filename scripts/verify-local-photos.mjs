import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const sourceRoot = resolve(import.meta.dirname, "..");
const baseURL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const edgePath = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const payload = JSON.parse(
  readFileSync(resolve(sourceRoot, "public/data/hongtang-real-map-features.json"), "utf8"),
);
const photos = payload.features.flatMap((feature) =>
  (feature.imageUrls ?? []).map((url) => ({ featureId: feature.id, url })),
);

assert.equal(payload.meta.photoStorage, "local-webp");
assert.equal(photos.length, 586);
assert.equal(new Set(photos.map((photo) => photo.url)).size, 586);
for (const photo of photos) {
  assert.match(photo.url, /^\/local-photos\/(poi|village)\/[a-f0-9]{24}\.webp$/);
  const path = resolve(sourceRoot, "public", photo.url.slice(1));
  assert(statSync(path).size > 512, `${photo.url} should be a non-empty local photo`);
}

const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
const sampleStep = Math.max(1, Math.floor(photos.length / 12));
for (const photo of photos.filter((_, index) => index % sampleStep === 0).slice(0, 12)) {
  const response = await page.request.get(new URL(photo.url, baseURL).href);
  assert(response.ok(), `${photo.url} should be served by the website`);
  assert.match(response.headers()["content-type"] ?? "", /^image\/webp/);
  assert((await response.body()).byteLength > 512);
}

await page.goto(baseURL, { waitUntil: "domcontentloaded" });
await page.locator(".amap-village-map[data-map-provider='amap']").waitFor({ timeout: 20000 });
const featureWithPhoto = photos[0].featureId;
const marker = page.locator(`.amap-react-marker-layer .map-marker[data-feature-id='${featureWithPhoto}']`);
await marker.waitFor({ timeout: 10000 });
await marker.click({ force: true });
const bubbleImage = page.locator(".map-selection-bubble img").first();
await bubbleImage.waitFor({ timeout: 5000 });
assert.match(await bubbleImage.getAttribute("src"), /^\/local-photos\//);
assert((await bubbleImage.evaluate((image) => image.naturalWidth)) > 0);

await browser.close();
console.log(JSON.stringify({ status: "passed", photos: photos.length, sampled: 12 }, null, 2));

