import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { chromium } from "playwright-core";

const sourceRoot = resolve(import.meta.dirname, "..");
const projectRoot = resolve(sourceRoot, "..");
const dataPath = resolve(sourceRoot, "public/data/hongtang-real-map-features.json");
const outputRoot = resolve(projectRoot, "平台素材/现场照片/video-posters");
const edgePath = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const payload = JSON.parse(readFileSync(dataPath, "utf8"));
const videoUrls = [
  ...new Set(
    payload.features.flatMap((feature) =>
      (feature.imageUrls ?? []).filter((url) =>
        [".mp4", ".mov", ".m4v", ".webm"].includes(extname(new URL(url).pathname).toLowerCase()),
      ),
    ),
  ),
];

mkdirSync(outputRoot, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.setContent(`
  <style>
    html, body { margin: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
    video { display: block; width: 1600px; height: 1200px; object-fit: contain; background: #000; }
  </style>
  <video id="poster" muted playsinline preload="auto"></video>
`);

for (const url of videoUrls) {
  await page.evaluate(async (source) => {
    const video = document.querySelector("#poster");
    video.pause();
    video.removeAttribute("src");
    video.load();
    await new Promise((resolvePromise, rejectPromise) => {
      const timeout = setTimeout(() => rejectPromise(new Error("video poster timeout")), 120000);
      video.onloadeddata = async () => {
        clearTimeout(timeout);
        try {
          video.currentTime = Math.min(1, Math.max(0, (video.duration || 1) * 0.05));
          await video.play().catch(() => undefined);
          setTimeout(() => {
            video.pause();
            resolvePromise();
          }, 800);
        } catch (error) {
          rejectPromise(error);
        }
      };
      video.onerror = () => {
        clearTimeout(timeout);
        rejectPromise(new Error(`video load failed: ${video.error?.message ?? "unknown error"}`));
      };
      video.src = source;
      video.load();
    });
  }, url);
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 24);
  const output = resolve(outputRoot, `${hash}.png`);
  await page.locator("#poster").screenshot({ path: output });
  console.log(output);
}

await browser.close();
console.log(JSON.stringify({ status: "ready", videos: videoUrls.length, outputRoot }, null, 2));
