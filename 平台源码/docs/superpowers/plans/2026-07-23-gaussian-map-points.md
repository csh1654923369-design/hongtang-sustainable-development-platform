# 红塘村三维地点图钉 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在红塘村 3D 高斯首页加入 5 个固定演示地点图钉，点击后复用二维地图详情，只有用户主动选择“定位到此处”时才移动镜头。

**Architecture:** Cesium iframe 负责把 5 个局部偏移投射到高斯模型、绘制和拾取实体；React 父页面负责读取现有 `mapFeatures`、显示详情及发送定位/清除命令。双方沿用同源 `postMessage` 通道，只传点位 ID 和最小渲染配置，业务详情保持单一数据源。

**Tech Stack:** Next.js 16、React 19、TypeScript 6、CesiumJS 1.143、Playwright Core、python-docx。

## Global Constraints

- 第一版只接入 `map-13`、`map-14`、`map-15`、`map-16`、`map-17`。
- 三维位置是固定演示位置，页面必须显示“演示位置，待实地核实”。
- 选择图钉只打开详情和高亮，不移动镜头；只有“定位到此处”触发 1.2 秒镜头动画。
- 不增加筛选、点位聚合、Supabase 写入、用户新增点位或真实坐标声明。
- 不破坏左键旋转、右键水平平移、滚轮定比缩放和两项灵敏度设置。
- 390 像素视口使用底部详情，不得产生横向溢出。
- README 与使用手册必须同步；按用户要求不运行 LibreOffice，只执行 DOCX 结构检查并在交付时说明。
- 当前工作树包含既有未提交改动。实施过程中只修改本计划列出的文件，不执行重置、清理或批量提交；生产文件不提交，除非用户另行授权整理现有改动。

---

### Task 1: 为五个三维点位建立失败的浏览器验收测试

**Files:**
- Modify: `scripts/demo-smoke.mjs:89-120`

**Interfaces:**
- Consumes: 现有 `#hongtang-gaussian-frame` 和 `data-gaussian-state="ready"`。
- Produces: 对 iframe 根元素 `data-gaussian-point-count`、`data-gaussian-point-manifest` 的外部行为约束。

- [ ] **Step 1: 写入只验证点位集合的失败测试**

在现有 3D 首页测试之后加入：

```js
await run("3D Gaussian home creates five typed demo points", async () => {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.locator("[data-gaussian-state='ready']").waitFor({ timeout: 45000 });
  const frame = page.frameLocator("#hongtang-gaussian-frame");
  const html = frame.locator("html[data-gaussian-point-count='5']");
  await html.waitFor({ timeout: 45000 });

  const manifest = JSON.parse(await html.getAttribute("data-gaussian-point-manifest"));
  assert.deepEqual(manifest.map((point) => point.id), ["map-13", "map-14", "map-15", "map-16", "map-17"]);
  assert.deepEqual(manifest.map((point) => point.shortLabel), ["花", "茶", "厂", "水", "光"]);
  assert.deepEqual(manifest.map((point) => point.color), ["#4f8d55", "#71803a", "#8b6b32", "#3387a0", "#d6942b"]);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `npm run test:demo`

Expected: 新增用例因 `html[data-gaussian-point-count='5']` 超时而失败；原有用例继续通过。

- [ ] **Step 3: 保存失败证据**

在实施记录中保留失败用例名称和超时原因。不要修改生产代码，也不要改弱断言。

---

### Task 2: 建立单一配置源并在 Cesium 中创建五个锚定实体

**Files:**
- Create: `src/data/gaussianDemoPoints.ts`
- Modify: `src/components/home/GaussianHome.tsx:1-35`
- Modify: `public/gaussian-viewer/index.html:180-220, 450-469`
- Test: `scripts/demo-smoke.mjs`

**Interfaces:**
- Consumes: `contentService.getMapFeatures(): SpatialFeature[]`、`tileset.boundingSphere`。
- Produces: `GaussianPointPayload`、`GAUSSIAN_DEMO_POINTS`、消息 `hongtang-gaussian-points-set`、iframe 数据属性和 5 个 Cesium Entity。

- [ ] **Step 1: 创建严格类型的固定配置**

`src/data/gaussianDemoPoints.ts` 使用以下完整结构：

```ts
export const gaussianDemoPointIds = ["map-13", "map-14", "map-15", "map-16", "map-17"] as const;
export type GaussianDemoPointId = (typeof gaussianDemoPointIds)[number];

export type GaussianPointPayload = {
  id: GaussianDemoPointId;
  categoryLabel: string;
  shortLabel: string;
  color: string;
  eastRatio: number;
  northRatio: number;
};

export const gaussianDemoPoints: GaussianPointPayload[] = [
  { id: "map-13", categoryLabel: "小花园", shortLabel: "花", color: "#4f8d55", eastRatio: -0.32, northRatio: 0.18 },
  { id: "map-14", categoryLabel: "茶场", shortLabel: "茶", color: "#71803a", eastRatio: -0.08, northRatio: 0.32 },
  { id: "map-15", categoryLabel: "茶厂", shortLabel: "厂", color: "#8b6b32", eastRatio: 0.22, northRatio: 0.18 },
  { id: "map-16", categoryLabel: "村里用水", shortLabel: "水", color: "#3387a0", eastRatio: 0.33, northRatio: -0.14 },
  { id: "map-17", categoryLabel: "光伏设施", shortLabel: "光", color: "#d6942b", eastRatio: -0.18, northRatio: -0.28 },
];

export function isGaussianDemoPointId(value: unknown): value is GaussianDemoPointId {
  return typeof value === "string" && gaussianDemoPointIds.includes(value as GaussianDemoPointId);
}
```

- [ ] **Step 2: 从父页面可靠发送最后一批点位**

在 `GaussianHome` 中使用 `useRef<HTMLIFrameElement>`，封装：

```ts
const sendPoints = () => frameRef.current?.contentWindow?.postMessage(
  { type: "hongtang-gaussian-points-set", points: gaussianDemoPoints },
  window.location.origin,
);
```

在 iframe `onLoad`、收到 `hongtang-gaussian-ready`、以及已有每秒状态轮询时调用 `sendPoints()`。消息监听继续先校验 `event.origin`。

- [ ] **Step 3: 在 viewer 中校验消息并缓存配置**

加入允许 ID 集合和校验函数；无效数组发送 `hongtang-gaussian-points-error`，不得删除已经显示的有效实体。重复收到同一 ID 时更新既有实体而不是新增。

```js
const ALLOWED_POINT_IDS = new Set(["map-13", "map-14", "map-15", "map-16", "map-17"]);
let pendingGaussianPoints = [];
const gaussianPointEntities = new Map();
const gaussianPointPositions = new Map();
```

- [ ] **Step 4: 实现局部坐标与表面投射**

实现 `placeGaussianPoint(point)`：从 `boundingSphere.center` 计算局部上、东、北；从目标点上方沿 `-up` 调用 `scene.pickFromRayMostDetailed`；命中时抬高 `Math.max(0.8, radius * 0.004)`，失败时使用 `radius * 0.06` 备用高度。每个点失败独立捕获。

- [ ] **Step 5: 创建 Cesium billboard 与 label**

`viewer.entities.add` 的 ID 使用 `hongtang-point-${point.id}`。billboard 由内联 SVG data URI 生成，颜色和单字短标签来自 payload；label 始终显示 `categoryLabel`，使用白底深色描边并按距离缩放。实体的 `properties.featureId` 保存原始 ID。

- [ ] **Step 6: 暴露稳定的运行状态**

全部处理后设置：

```js
document.documentElement.dataset.gaussianPointCount = String(gaussianPointEntities.size);
document.documentElement.dataset.gaussianPointManifest = JSON.stringify(
  pendingGaussianPoints.map(({ id, shortLabel, color }) => ({ id, shortLabel, color })),
);
tellParent("hongtang-gaussian-points-ready", { count: gaussianPointEntities.size });
```

在 `scene.postRender` 中用 `SceneTransforms.worldToWindowCoordinates` 更新 `data-gaussian-point-screen-positions`，为实际 Canvas 点击测试提供当前可见坐标。

- [ ] **Step 7: 运行测试并确认 GREEN**

Run: `npm run test:demo`

Expected: 新增“五个类型化点位”用例通过；全部既有用例通过。

---

### Task 3: 先写选择失败测试，再复用二维详情且保持相机不动

**Files:**
- Modify: `scripts/demo-smoke.mjs`
- Modify: `public/gaussian-viewer/index.html`
- Modify: `src/components/home/GaussianHome.tsx`
- Modify: `src/components/map/MapDetailDrawer.tsx:22-57`
- Modify: `src/app/globals.css:1259-1298, 1384-1396`

**Interfaces:**
- Consumes: `data-gaussian-point-screen-positions`、`SpatialFeature`、现有事项路由映射。
- Produces: `hongtang-gaussian-point-selected`、`variant="gaussian"` 详情、`data-selected-gaussian-point`。

- [ ] **Step 1: 写入实际点击与相机不动的失败测试**

测试读取 `map-13` 当前屏幕坐标并点击 Canvas：

```js
const pointPositions = JSON.parse(await frame.locator("html").getAttribute("data-gaussian-point-screen-positions"));
const gardenPosition = pointPositions["map-13"];
assert.ok(gardenPosition?.x > 0 && gardenPosition?.y > 0);
const cameraBefore = await frame.locator("html").getAttribute("data-gaussian-camera-signature");
await gaussianCanvas.click({ position: gardenPosition });
await page.locator(".gaussian-home-point-detail h2").getByText("小花园示范记录点", { exact: true }).waitFor();
await page.getByText("演示位置，待实地核实", { exact: true }).waitFor();
assert.equal(await frame.locator("html").getAttribute("data-selected-gaussian-point"), "map-13");
assert.equal(await frame.locator("html").getAttribute("data-gaussian-camera-signature"), cameraBefore);
```

- [ ] **Step 2: 运行并确认 RED**

Run: `npm run test:demo`

Expected: Canvas 点击后详情标题超时；五点创建测试仍通过。

- [ ] **Step 3: 在 Cesium 中处理 LEFT_CLICK**

使用 `Cesium.ScreenSpaceEventHandler` 和 `scene.pick(event.position)`。只有拾取实体的 `properties.featureId` 属于允许集合时才更新选择；修改选中 billboard scale/label 样式，设置 `data-selected-gaussian-point`，发送点位 ID。此路径不得调用任何 camera 方法。

- [ ] **Step 4: 在父页面映射点位 ID**

`GaussianHome` 调用 `contentService.getMapFeatures()` 并只保留 5 个 ID。收到选择消息后设置 `selectedFeature`，同时发送 `{ type: "hongtang-gaussian-detail-state", open: true }`。

- [ ] **Step 5: 为 MapDetailDrawer 增加三维变体**

把签名扩展为：

```ts
type MapDetailDrawerProps = {
  feature?: SpatialFeature;
  onClose: () => void;
  onLocate?: () => void;
  variant?: "map" | "gaussian";
};
```

`variant="map"` 保持所有旧分支；`variant="gaussian"` 把坐标行替换为“演示位置，待实地核实”，隐藏“关注点位”，显示可选的“定位到此处”和现有“查看详情”链接。

- [ ] **Step 6: 加入桌面右侧与手机底部样式**

父页面容器使用 `.gaussian-home-point-detail`。桌面端绝对定位在右侧，宽度 `clamp(340px, 28vw, 380px)`；390 像素断点改为左右各 8px、底部 8px、最大高度 `55dvh`。详情打开时主容器增加 `.detail-open`。

- [ ] **Step 7: 同步 viewer 工具避让**

收到 `hongtang-gaussian-detail-state` 时切换 `document.body.classList.toggle("detail-open", open)`，打开时关闭操作设置。桌面 CSS 把 `.viewer-tools` 和 `.control-panel` 的 `right` 调整到 `400px`；移动端不横移。

- [ ] **Step 8: 运行并确认 GREEN**

Run: `npm run test:demo`

Expected: 实际点击打开小花园详情，显示演示位置提示，相机签名前后相同；所有旧用例通过。

---

### Task 4: 先写定位、关闭和移动端失败测试，再完成交互

**Files:**
- Modify: `scripts/demo-smoke.mjs`
- Modify: `public/gaussian-viewer/index.html`
- Modify: `src/components/home/GaussianHome.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `hongtang-gaussian-point-focus`、`hongtang-gaussian-point-clear`。
- Produces: 1.2 秒飞行、Escape 关闭、手机底部详情、`data-gaussian-focus-count`。

- [ ] **Step 1: 写定位与关闭的失败断言**

在选中 `map-13` 后加入：

```js
const focusBefore = Number(await frame.locator("html").getAttribute("data-gaussian-focus-count") ?? "0");
await page.getByRole("button", { name: "定位到此处", exact: true }).click();
await frame.locator(`html[data-gaussian-focus-count='${focusBefore + 1}']`).waitFor();
await page.keyboard.press("Escape");
await page.locator(".gaussian-home-point-detail").waitFor({ state: "detached" });
assert.equal(await frame.locator("html").getAttribute("data-selected-gaussian-point"), "");
```

移动端用现有 `mobilePage` 打开同一点位，断言详情计算样式的 `position` 为 `absolute`、左右均接近 8px、`scrollWidth <= clientWidth`。

- [ ] **Step 2: 运行并确认 RED**

Run: `npm run test:demo`

Expected: 找不到“定位到此处”或 focus count 不变；前两项新增测试继续通过。

- [ ] **Step 3: 实现显式定位**

父页面 `onLocate` 发送点位 ID。viewer 从缓存取得位置，构造小包围球并调用：

```js
viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(position, radius * 0.02), {
  duration: 1.2,
  offset: new Cesium.HeadingPitchRange(0.15, -0.38, Math.max(radius * 0.12, 8)),
});
```

每次调用后递增 `data-gaussian-focus-count`；未找到 ID 时发送点位错误，不移动相机。

- [ ] **Step 4: 实现统一关闭**

关闭按钮和 `Escape` 都调用同一 `clearSelectedPoint()`：清除 React 状态，向 iframe 发送 `hongtang-gaussian-point-clear` 和关闭详情状态。viewer 恢复图钉样式并把 `data-selected-gaussian-point` 设为空字符串。

- [ ] **Step 5: 验证移动端**

确认底部详情不遮住浏览器底部安全区，使用 `overflow-y: auto`，两个操作按钮在窄屏改为纵向排列。

- [ ] **Step 6: 运行并确认 GREEN**

Run: `npm run test:demo`

Expected: 定位计数增加、Escape 清除、移动端无溢出，所有用例通过。

---

### Task 5: 更新说明文档并完成全量验证

**Files:**
- Modify: `README.md:3, 35-67, 90-104`
- Create: `scripts/update-manual-gaussian-map-points.py`
- Modify: `红塘村可持续发展平台使用手册.docx`（项目根目录）
- Generate for QA only: `.qa/home-1440.png`、`.qa/红塘村可持续发展平台使用手册.V1.15.backup.docx`

**Interfaces:**
- Consumes: 浏览器测试生成的最新 3D 首页截图、现有 V1.15 手册。
- Produces: README 三维点位说明、V1.16 手册、可重复执行的更新脚本。

- [ ] **Step 1: 更新 README**

明确写入：5 个点位类别、演示位置边界、点击不自动移动、“定位到此处”才飞近、详情复用二维数据、第一版不含筛选与真实坐标。

- [ ] **Step 2: 按 documents 技能编辑现有手册**

运行前完整读取 `documents/tasks/create_edit.md`。新脚本必须：备份 V1.15；升级封面版本为 V1.16；替换图 1 为新首页截图；更新 3D 操作段、功能表、技术说明、故障排查和版本记录；延续正文宋体、西文 Times New Roman、标题黑体、黑色文字和 `w:firstLineChars="200"`。

- [ ] **Step 3: 执行 DOCX 结构检查**

使用工作区依赖提供的 Python 运行脚本，检查：ZIP 无损坏、13 张图片、表格行数 `[5, 22, 9, 13, 18]`、版本含 V1.16、正文含“演示位置，待实地核实”和“定位到此处”、原生两字符首行缩进不少于 18 个。按用户要求不运行 LibreOffice。

- [ ] **Step 4: 运行完整验证**

Run:

```powershell
npm run test:demo
npm run lint
npm run typecheck
npm run build
git -c safe.directory='E:/BaiduSyncdisk/研一下/红塘可持续发展平台/平台源码' diff --check
```

Expected: 所有浏览器用例通过；lint、类型检查、24 个 Next.js 路由构建和空白检查通过。

- [ ] **Step 5: 可视检查网页截图**

打开 `.qa/home-1440.png` 和 390 像素移动端截图，确认 5 个图钉均在模型范围内、标签不遮住主要模型、详情不与工具重叠。若某点脱离模型，只调整 `eastRatio`、`northRatio` 后重新运行全部测试，最终数值保持固定。

- [ ] **Step 6: 重启网站并检查 HTTP**

使用 `scripts/stop-site.ps1` 和 `scripts/start-site.ps1 -NoBrowser`，确认 `/` 与 `/gaussian-viewer/index.html` 均返回 200，并确认 viewer HTML 含三维点位消息类型。

---

## Plan Self-Review Result

- 设计中的 5 个 ID、颜色、短标签、固定偏移、详情、显式定位、错误隔离、移动端和文档要求均有对应任务。
- 消息类型、数据类型和组件参数在各任务之间一致。
- 计划没有未定义的点位、占位步骤或额外的筛选/Supabase 范围。
- 测试顺序满足 RED → GREEN：点位创建、选择详情、定位关闭分别先失败再实现。
