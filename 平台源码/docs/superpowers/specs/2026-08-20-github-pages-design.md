# GitHub Pages 公开发布设计

## 目标

把当前“红塘村可持续发展平台”发布为任何人都能直接访问的 GitHub Pages 网站，同时保留本地开发和 Vercel 部署能力，不把本地环境文件或服务端密钥提交到公开仓库。

## 发布地址

默认地址为：

`https://csh1654923369-design.github.io/hongtang-sustainable-development-platform/`

后续可以把 `hongtang.xiangcun.online` 绑定到同一 Pages 站点，但本轮不修改阿里云域名解析。

## 架构

GitHub Actions 在每次推送到 `main` 后，从 `平台源码` 构建静态站点并发布 `out` 目录。Next.js 的页面与客户端交互逻辑保留，服务端 Route Handlers 不进入 Pages 构建副本。Supabase继续由浏览器读取公开数据；高德Web Key、Web安全密钥和Cesium Ion受限令牌通过GitHub Actions Secrets注入静态构建产物，不写入Git历史。

GitHub Pages项目站点位于仓库子路径下，因此统一通过 `sitePath()` 为公开素材、数据文件、iframe和页面入口添加 `/hongtang-sustainable-development-platform` 前缀。本地和Vercel环境的前缀保持为空。

## 静态兼容

- `next.config.ts` 仅在 `GITHUB_PAGES=true` 时启用 `output: "export"`、仓库 `basePath`、`assetPrefix`、尾斜杠和未优化图片。
- `scripts/build-github-pages.mjs` 在临时副本中移除仅能由Node服务器运行的API目录，生成浏览器运行时配置并执行构建，不改动日常开发源码。
- 高德地图优先读取构建期公开配置；本地和Vercel仍回退到 `/api/amap-config`。
- Cesium查看器优先读取Pages运行时配置；本地和Vercel仍回退到 `/api/cesium-ion/asset`。
- 本地高斯模型和本地Cesium模型API不作为Pages的主加载来源；Pages继续使用Cesium Ion资产。

## 安全边界

- 不提交 `.env.local`、`.env.production.local`、令牌、密码、服务端Supabase密钥或阿里云凭证。
- 只注入浏览器本来就能看到的高德Web Key、Web安全密钥、Cesium受限令牌、Supabase URL和Publishable Key。
- 发布前扫描被Git跟踪的文件，确认没有本地环境文件和常见密钥格式。

## 自动发布

根目录 `.github/workflows/deploy-pages.yml` 在 `main` 更新时运行：安装Node 24与依赖、执行Pages验证、生成静态站点、上传Pages产物并部署。仓库切换为公开后，通过GitHub API启用 `workflow` 发布源。

## 验证

- Pages专用验证脚本检查基础路径、公开配置回退、Cesium配置和工作流。
- 运行类型检查、ESLint及现有专题与编辑器验证脚本。
- 执行完整静态构建，确认 `out/index.html`、`out/map-editor/index.html`、数据、Cesium查看器和静态资源存在。
- 发布后检查Pages API、Actions状态、首页HTTP状态及核心静态资源HTTP状态。
