import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseURL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const edgePath =
  process.env.EDGE_PATH ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function vectorDistance(left, right) {
  return Math.hypot(...left.map((value, index) => value - right[index]));
}

function cameraDelta(left, right) {
  return Math.max(
    vectorDistance(left.position, right.position),
    vectorDistance(left.direction, right.direction),
    vectorDistance(left.up, right.up),
    Math.abs(left.height - right.height),
  );
}

function assertFiniteCamera(snapshot) {
  assert(snapshot, "Cesium camera snapshot is unavailable");
  assert(snapshot.position.every(Number.isFinite));
  assert(snapshot.direction.every(Number.isFinite));
  assert(snapshot.up.every(Number.isFinite));
  assert(snapshot.right.every(Number.isFinite));
  assert(Number.isFinite(snapshot.height));
}

const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
});

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    locale: "zh-CN",
  });
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    browserErrors.push(`${request.url()}: ${failure?.errorText ?? "request failed"}`);
  });

  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page
    .locator(".amap-village-map[data-map-provider='amap']")
    .waitFor({ state: "visible", timeout: 30000 });
  await page.getByRole("button", { name: "3D实景", exact: true }).click();
  await page.locator(".gaussian-home").waitFor({ timeout: 30000 });

  try {
    await page.locator('[data-gaussian-state="ready"]').waitFor({ timeout: 60000 });
  } catch (error) {
    const state = await page
      .locator("[data-gaussian-state]")
      .first()
      .getAttribute("data-gaussian-state")
      .catch(() => null);
    const iframeStatus = await page
      .frameLocator("#hongtang-gaussian-frame")
      .locator("#viewerStatus")
      .textContent()
      .catch(() => null);
    throw new Error(
      `3D model did not become ready; state=${state}; iframeStatus=${iframeStatus}; browserErrors=${browserErrors.join(" | ")}`,
      { cause: error },
    );
  }

  const frame = page.frameLocator("#hongtang-gaussian-frame");
  const viewerBody = frame.locator('body[data-cesium-ready="true"][data-model-ready="true"]');
  await viewerBody.waitFor({ timeout: 30000 });
  await frame
    .locator('body:not([data-real-point-count="0"]):not([data-visible-point-count="0"])')
    .waitFor({ timeout: 30000 });

  const toolbar = frame.locator(".scene-tools");
  const toolbarState = {
    labels: await toolbar.locator("button").evaluateAll((buttons) =>
      buttons
        .filter((button) => getComputedStyle(button).display !== "none")
        .map((button) => button.getAttribute("aria-label"))),
    homeCardCount: await frame.locator(".home-card").count(),
  };
  assert.deepEqual(toolbarState, {
    labels: ["回到中心", "操作设置", "全屏查看"],
    homeCardCount: 0,
  });

  const loadState = {
    cesiumReady: await viewerBody.getAttribute("data-cesium-ready"),
    modelReady: await viewerBody.getAttribute("data-model-ready"),
    modelSource: await viewerBody.getAttribute("data-model-source"),
    terrainMode: await viewerBody.getAttribute("data-terrain-mode"),
    realPointCount: Number(await viewerBody.getAttribute("data-real-point-count")),
    visiblePointCount: Number(await viewerBody.getAttribute("data-visible-point-count")),
  };
  assert.equal(loadState.cesiumReady, "true");
  assert.equal(loadState.modelReady, "true");
  assert(["cesium-ion", "local-fallback"].includes(loadState.modelSource));
  assert(["cesium-world-terrain", "local-height-overlay", "ellipsoid-fallback"].includes(loadState.terrainMode));
  assert(loadState.realPointCount > 0);
  assert(loadState.visiblePointCount > 0);

  const controlState = {
    leftDrag: await viewerBody.getAttribute("data-left-drag-action"),
    rightDrag: await viewerBody.getAttribute("data-right-drag-action"),
    wheel: await viewerBody.getAttribute("data-wheel-action"),
    middleDrag: await viewerBody.getAttribute("data-middle-drag-action"),
  };
  assert.deepEqual(controlState, {
    leftDrag: "horizontal-pan",
    rightDrag: "orbit-screen-center-relative",
    wheel: "fixed-ratio-zoom",
    middleDrag: "disabled",
  });

  const canvas = frame.locator(".cesium-widget canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 30000 });
  const canvasBox = await canvas.boundingBox();
  assert(canvasBox, "3D canvas is not visible");

  const cameraSnapshot = async () => {
    const snapshot = await viewerBody.evaluate(() => window.__hongtangCesium?.cameraSnapshot?.());
    assertFiniteCamera(snapshot);
    return snapshot;
  };

  const leftBefore = await cameraSnapshot();
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.36, canvasBox.y + canvasBox.height * 0.62);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.42,
    canvasBox.y + canvasBox.height * 0.64,
    { steps: 5 },
  );
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(250);
  const leftAfter = await cameraSnapshot();
  assert(vectorDistance(leftBefore.position, leftAfter.position) > 0.01, "left drag should pan the camera");
  assert(vectorDistance(leftBefore.direction, leftAfter.direction) < 1e-5, "left drag should preserve view direction");

  const middleBefore = await cameraSnapshot();
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.44, canvasBox.y + canvasBox.height * 0.58);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.5,
    canvasBox.y + canvasBox.height * 0.62,
    { steps: 4 },
  );
  await page.mouse.up({ button: "middle" });
  await page.waitForTimeout(200);
  const middleAfter = await cameraSnapshot();
  assert(cameraDelta(middleBefore, middleAfter) < 1e-5, "middle drag should remain disabled");

  const orbitBefore = await cameraSnapshot();
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.65, canvasBox.y + canvasBox.height * 0.62);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.72,
    canvasBox.y + canvasBox.height * 0.62,
    { steps: 5 },
  );
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(250);
  const orbitAfter = await cameraSnapshot();
  assert(vectorDistance(orbitBefore.position, orbitAfter.position) > 0.01, "right drag should orbit the camera position");
  assert(vectorDistance(orbitBefore.direction, orbitAfter.direction) > 1e-6, "right drag should rotate the view direction");

  const verticalBefore = await cameraSnapshot();
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.68, canvasBox.y + canvasBox.height * 0.64);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.68,
    canvasBox.y + canvasBox.height * 0.56,
    { steps: 5 },
  );
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(250);
  const verticalAfter = await cameraSnapshot();
  assert(cameraDelta(verticalBefore, verticalAfter) > 1e-5, "vertical right drag should change camera pitch");

  const wheelBefore = await cameraSnapshot();
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.5);
  await page.mouse.wheel(0, -100);
  await page.waitForTimeout(250);
  const wheelAfter = await cameraSnapshot();
  assert(vectorDistance(wheelBefore.position, wheelAfter.position) > 0.01, "wheel should change camera range");
  assert(vectorDistance(wheelBefore.direction, wheelAfter.direction) < 1e-5, "wheel should preserve view direction");

  console.log(JSON.stringify({
    status: "passed",
    loadState,
    toolbarState,
    controlState,
    leftPanDistance: vectorDistance(leftBefore.position, leftAfter.position),
    middleDragDelta: cameraDelta(middleBefore, middleAfter),
    orbitPositionDelta: vectorDistance(orbitBefore.position, orbitAfter.position),
    orbitDirectionDelta: vectorDistance(orbitBefore.direction, orbitAfter.direction),
    verticalOrbitDelta: cameraDelta(verticalBefore, verticalAfter),
    wheelDistance: vectorDistance(wheelBefore.position, wheelAfter.position),
    browserErrors,
  }, null, 2));
} finally {
  await browser.close();
}
