# 红塘村高斯模型轻量化结果

## 已生成文件

- `hongtang-recovered-sh0.ply`：从现有 3D Tiles 的末级瓦片恢复出的标准高斯 PLY，22,519,595 个点，约 1.17 GiB。
- `hongtang-recovered-sh0-lod.rad`：Spark 流式 LoD 索引，约 54 KiB。
- `hongtang-recovered-sh0-lod-0.radc` 至 `hongtang-recovered-sh0-lod-475.radc`：476 个按需加载分块。
- `spark-preview.html`：独立加载测试页。
- `recover.log`、`build-lod.log`：恢复和转换记录。

## 校验结果

- 末级瓦片数量：1,036。
- 恢复输入点数：22,519,595。
- 自动剔除完全透明点：94。
- Spark LoD 有效输入点：22,519,501。
- LoD 树总节点：31,183,605。
- 分块总大小：531.70 MiB。
- 原 Cesium 3D Tiles 包大小：735.31 MiB。
- 文件体积减少：约 27.7%。
- 476 个分块全部存在，且文件大小与 RAD 索引声明一致。

## 转换命令

```powershell
& "E:\BaiduSyncdisk\研一下\红塘可持续发展平台\平台素材\3D高斯展示\tools\spark\rust\target\release\build-lod.exe" `
  "E:\BaiduSyncdisk\研一下\红塘可持续发展平台\平台素材\3D高斯展示\轻量化模型\hongtang-recovered-sh0.ply" `
  --quality --rad-chunked --max-sh=0
```

网页加载时需要使用：

```js
new SplatMesh({
  url: "./hongtang-recovered-sh0-lod.rad",
  paged: true
});
```

不能直接双击 HTML 加载模型，必须通过本地网页服务访问。

本机预览：

```powershell
node .\serve-preview.mjs
```

随后打开 `http://127.0.0.1:4173/`。

## 正式平台接入

正式平台首页已经切换为 SparkJS 2.1.0，并直接使用本目录中的 RAD/RADC 流式成果。源码通过以下接口读取模型：

```text
平台源码/src/app/api/gaussian-model/[filename]/route.ts
```

接口支持 HTTP Range，只允许读取指定模型索引和数字编号分块。模型文件不需要复制到 `public`，也不会进入 Git 仓库或 Next.js 构建产物。默认读取本目录；换位置时可在 `平台源码/.env.local` 中设置：

```text
GAUSSIAN_MODEL_DIR=模型文件夹的绝对路径
```

正式首页保留了5个三维事项图钉、事项详情、“定位到此处”、左键平移、右键旋转、滚轮缩放、三档画质和全屏功能。性能优化后，桌面端“省电、均衡、清晰”三档分别以约18万、35万和65万个可见高斯点为目标，帧率上限分别为24、30和40帧；分块缓存由56页下调为24页。页面使用唯一的请求式刷新队列，模型和相机静止后停止连续绘制。

切换为 SparkJS 后，原 Cesium 全球地形、全球卫星影像和3D场景内单独叠加的无人机正射影像不再参与首页渲染；二维“村庄总览”和“村里一张图”仍保留无人机正射影像。后续若要恢复周边三维环境，应把地形转换为 Three.js 可加载的网格与贴图，再与高斯模型进行局部坐标配准。
