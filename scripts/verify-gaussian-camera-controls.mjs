import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseURL = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const edgePath =
  process.env.EDGE_PATH ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

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
      .locator("#statusText")
      .textContent()
      .catch(() => null);
    throw new Error(
      `3D model did not become ready; state=${state}; iframeStatus=${iframeStatus}; browserErrors=${browserErrors.join(" | ")}`,
      { cause: error },
    );
  }

  const frame = page.frameLocator("#hongtang-gaussian-frame");
  const toolbar = frame.locator(".viewer-tools");
  const toolbarState = {
    layout: await toolbar.getAttribute("data-toolbar-layout"),
    labels: await toolbar.locator("button").evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label")),
    ),
    iconCount: await toolbar.locator("svg").count(),
    homeCardCount: await frame.locator(".home-card").count(),
  };
  assert.deepEqual(toolbarState, {
    layout: "bottom-right-vertical-icons",
    labels: ["回到中心", "操作设置", "全屏查看"],
    iconCount: 3,
    homeCardCount: 0,
  });
  const canvas = frame.locator(".cesium-widget canvas").first();
  const html = frame.locator("html[data-gaussian-camera-signature]");
  await canvas.waitFor({ timeout: 30000 });
  await html.waitFor({ timeout: 30000 });

  const environment = {
    terrain: await html.getAttribute("data-terrain-mode"),
    worldImagery: await html.getAttribute("data-world-imagery-mode"),
    localImagery: await html.getAttribute("data-local-imagery-mode"),
    terrainDepthOcclusion: await html.getAttribute("data-terrain-depth-occlusion"),
    modelGeoreferenced: await html.getAttribute("data-model-georeferenced"),
    modelOriginLongitude: await html.getAttribute("data-model-origin-longitude"),
    modelOriginLatitude: await html.getAttribute("data-model-origin-latitude"),
    modelOriginHeight: await html.getAttribute("data-model-origin-height"),
  };
  assert.deepEqual(environment, {
    terrain: "world",
    worldImagery: "world-aerial",
    localImagery: "drone-orthophoto",
    terrainDepthOcclusion: "disabled-for-gaussian-overlay",
    modelGeoreferenced: "true",
    modelOriginLongitude: "99.908740607",
    modelOriginLatitude: "24.636255278",
    modelOriginHeight: "1764.0",
  });
  const pointPlacements = JSON.parse(
    await html.getAttribute("data-gaussian-point-placement-manifest"),
  );
  assert.equal(await html.getAttribute("data-gaussian-point-visible-count"), "5");
  assert.deepEqual(pointPlacements.map((point) => point.id), [
    "map-13",
    "map-14",
    "map-15",
    "map-16",
    "map-17",
  ]);
  assert(pointPlacements.every((point) => point.source.startsWith("gaussian")));
  assert(
    pointPlacements.every(
      (point) => point.terrainHeight === null || point.height > point.terrainHeight,
    ),
  );

  const flags = {
    leftPan: await canvas.getAttribute("data-horizontal-left-pan"),
    rightOrbit: await canvas.getAttribute("data-right-orbit"),
    rightOrbitPivot: await canvas.getAttribute("data-right-orbit-pivot"),
    rightOrbitVerticalMode: await canvas.getAttribute("data-right-orbit-vertical-mode"),
    middleDisabled: await canvas.getAttribute("data-middle-drag-disabled"),
  };
  assert.deepEqual(flags, {
    leftPan: "true",
    rightOrbit: "true",
    rightOrbitPivot: "screen-center",
    rightOrbitVerticalMode: "screen-center-orbit",
    middleDisabled: "true",
  });

  await canvas.dispatchEvent("pointerdown", {
    pointerId: 91,
    button: 0,
    buttons: 1,
    clientX: 260,
    clientY: 260,
  });
  await canvas.dispatchEvent("pointermove", {
    pointerId: 91,
    button: -1,
    buttons: 1,
    clientX: 300,
    clientY: 275,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 91,
    button: 0,
    buttons: 0,
    clientX: 300,
    clientY: 275,
  });
  assert.equal(await canvas.getAttribute("data-pan-moves"), "1");

  await canvas.dispatchEvent("pointerdown", {
    pointerId: 92,
    button: 1,
    buttons: 4,
    clientX: 320,
    clientY: 280,
  });
  await canvas.dispatchEvent("pointermove", {
    pointerId: 92,
    button: -1,
    buttons: 4,
    clientX: 360,
    clientY: 300,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 92,
    button: 1,
    buttons: 0,
    clientX: 360,
    clientY: 300,
  });
  assert.equal(await canvas.getAttribute("data-pan-moves"), "1");

  const canvasBox = await canvas.boundingBox();
  assert(canvasBox, "3D canvas is not visible");
  const beforeOrbit = await html.getAttribute("data-gaussian-camera-signature");
  const orbitMovesBefore = Number(await canvas.getAttribute("data-orbit-moves"));
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.65,
    canvasBox.y + canvasBox.height * 0.65,
  );
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.72,
    canvasBox.y + canvasBox.height * 0.65,
    { steps: 5 },
  );
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(300);
  const afterOrbit = await html.getAttribute("data-gaussian-camera-signature");
  assert.notEqual(afterOrbit, beforeOrbit);
  const orbitMoves = Number(await canvas.getAttribute("data-orbit-moves"));
  const orbitPivotScreenError = Number(
    await canvas.getAttribute("data-right-orbit-pivot-screen-error"),
  );
  assert(orbitMoves > orbitMovesBefore);
  assert(orbitPivotScreenError <= 1);

  const positionBeforeUp = await html.getAttribute("data-gaussian-camera-position-signature");
  const tiltBeforeUp = Number(await canvas.getAttribute("data-right-orbit-tilt-degrees"));
  const verticalMovesBeforeUp = Number(await canvas.getAttribute("data-orbit-vertical-moves"));
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.68,
    canvasBox.y + canvasBox.height * 0.65,
  );
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.68,
    canvasBox.y + canvasBox.height * 0.57,
    { steps: 5 },
  );
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(300);
  const tiltAfterUp = Number(await canvas.getAttribute("data-right-orbit-tilt-degrees"));
  assert(tiltAfterUp < tiltBeforeUp);
  assert.notEqual(await html.getAttribute("data-gaussian-camera-position-signature"), positionBeforeUp);
  assert(Number(await canvas.getAttribute("data-orbit-vertical-moves")) > verticalMovesBeforeUp);
  assert(Number(await canvas.getAttribute("data-right-orbit-pivot-screen-error")) <= 1);

  const positionBeforeDown = await html.getAttribute("data-gaussian-camera-position-signature");
  const tiltBeforeDown = Number(await canvas.getAttribute("data-right-orbit-tilt-degrees"));
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.68,
    canvasBox.y + canvasBox.height * 0.57,
  );
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.68,
    canvasBox.y + canvasBox.height * 0.72,
    { steps: 5 },
  );
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(300);
  const tiltAfterDown = Number(await canvas.getAttribute("data-right-orbit-tilt-degrees"));
  assert(tiltAfterDown > tiltBeforeDown);
  assert.notEqual(await html.getAttribute("data-gaussian-camera-position-signature"), positionBeforeDown);
  assert(Number(await canvas.getAttribute("data-right-orbit-pivot-screen-error")) <= 1);

  await canvas.dispatchEvent("wheel", { deltaY: -100 });
  assert.equal(await canvas.getAttribute("data-wheel-steps"), "1");

  console.log(
    JSON.stringify({
      environment,
      toolbarState,
      pointPlacements,
      flags,
      panMoves: await canvas.getAttribute("data-pan-moves"),
      rightOrbitChangedCamera: beforeOrbit !== afterOrbit,
      orbitMoves,
      orbitPivotScreenError,
      orbitPivotSource: await canvas.getAttribute("data-right-orbit-pivot-source"),
      verticalOrbitKeptScreenCenter: true,
      tiltBeforeUp,
      tiltAfterUp,
      tiltBeforeDown,
      tiltAfterDown,
      wheelSteps: await canvas.getAttribute("data-wheel-steps"),
    }),
  );
} finally {
  await browser.close();
}
