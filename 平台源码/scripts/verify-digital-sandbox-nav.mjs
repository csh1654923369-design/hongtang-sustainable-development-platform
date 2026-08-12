import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const baseURL = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3000";
const edgePath = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outputDir = resolve(process.env.QA_OUTPUT ?? ".qa");

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: edgePath, headless: true });

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto(baseURL, { waitUntil: "networkidle" });

  const desktopLink = desktopPage.locator(".desktop-nav").getByRole("link", { name: "数字沙盘", exact: true });
  await desktopLink.waitFor();
  assert(await desktopLink.isVisible(), "桌面端数字沙盘入口不可见");
  await desktopPage.screenshot({ path: resolve(outputDir, "home-1440.png"), fullPage: false });
  await desktopLink.click();
  await desktopPage.waitForURL(`${baseURL}/digital-twin`);
  await desktopPage.getByRole("heading", { name: "数字沙盘", exact: true }).waitFor();

  await desktop.close();
  console.log("数字沙盘入口验证通过：桌面顶部导航可进入数字沙盘页面。");
} finally {
  await browser.close();
}
