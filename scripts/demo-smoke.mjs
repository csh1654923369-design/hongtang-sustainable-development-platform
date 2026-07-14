import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const baseURL = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3000";
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
  serverProcess = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1"], {
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
  try {
    await task();
    results.push({ name, status: "passed" });
  } catch (error) {
    results.push({ name, status: "failed", error: error instanceof Error ? error.message : String(error) });
  }
}

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
const page = await desktop.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await run("all routes respond and render headings", async () => {
  const routes = [
    "/",
    "/village",
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
  ];
  for (const route of routes) {
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
    assert(response?.ok(), `${route} returned ${response?.status()}`);
    await page.locator("h1, .access-gate h2").first().waitFor();
  }
});

await run("resident completes issue report and sees it in profile", async () => {
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await setRole(page, "村民");
  await page.locator(".app-header .button-report").click();
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
  await page.getByRole("button", { name: "关注项目" }).click();
  await page.getByRole("button", { name: "取消关注" }).waitFor();
  await page.locator(".project-participation textarea").fill("建议临时样段保留足够通行宽度，并观察不同时间段的使用情况。");
  await page.getByRole("button", { name: "提交建议" }).click();
  await page.getByText("建议已提交").waitFor();
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
  for (const route of ["/", "/map", "/village", "/participate"]) {
    await mobilePage.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
    const dimensions = await mobilePage.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    assert(dimensions.scrollWidth <= dimensions.innerWidth + 1, `${route} overflows: ${dimensions.scrollWidth} > ${dimensions.innerWidth}`);
  }
  await mobilePage.goto(`${baseURL}/`, { waitUntil: "networkidle" });
  await mobilePage.screenshot({ path: resolve(outputDir, "home-390.png"), fullPage: false });
  await mobilePage.goto(`${baseURL}/map`, { waitUntil: "networkidle" });
  await mobilePage.screenshot({ path: resolve(outputDir, "map-390.png"), fullPage: false });
});

await desktop.close();
await mobile.close();
await browser.close();
stopServer();

if (consoleErrors.length) {
  results.push({ name: "browser console errors", status: "failed", error: consoleErrors.join(" | ") });
}

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.status === "failed")) process.exit(1);
