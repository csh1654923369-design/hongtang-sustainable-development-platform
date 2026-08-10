import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const platformRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(platformRoot, "vendor", "geolibre");
const sourcePackage = resolve(sourceRoot, "package.json");
const sourceModules = resolve(sourceRoot, "node_modules");
const sourceDist = resolve(sourceRoot, "apps", "geolibre-desktop", "dist");
const publicRoot = resolve(platformRoot, "public");
const publicTarget = resolve(publicRoot, "geolibre");
const stagedTarget = resolve(publicRoot, ".geolibre-local-build");
const previousTarget = resolve(publicRoot, ".geolibre-previous-build");

if (!existsSync(sourcePackage)) {
  throw new Error(`未找到项目内的 GeoLibre 源码：${sourcePackage}`);
}
if (!existsSync(sourceModules)) {
  throw new Error("GeoLibre 本地依赖尚未安装，请先运行 npm run geolibre:install");
}

const packageJson = JSON.parse(readFileSync(sourcePackage, "utf8"));
console.log(`正在从项目内 GeoLibre ${packageJson.version} 源码构建网页……`);

const buildCommand = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
const buildArgs = process.platform === "win32" ? ["/d", "/s", "/c", "npm run build"] : ["run", "build"];
const result = spawnSync(buildCommand, buildArgs, {
  cwd: sourceRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    GEOLIBRE_APP_BASE: "/geolibre/",
    // 红塘页面嵌在主平台中，不注册独立 PWA，也不预缓存整套通用 GIS 工具。
    GEOLIBRE_EMBED: "1",
    // 数据库、栅格和专业分析入口已从红塘专用界面隐藏。保留上游的按需
    // CDN 边界可避免把从不使用的数据库/分析 WASM（约百兆）复制进部署包。
    GEOLIBRE_PGLITE_CDN: "1",
    GEOLIBRE_CEREUS_CDN: "1",
    GEOLIBRE_GDAL_CDN: "1",
  },
});

if (result.status !== 0) {
  const detail = result.error instanceof Error ? `，${result.error.message}` : "";
  throw new Error(`GeoLibre 本地源码构建失败，退出码：${result.status ?? "unknown"}${detail}`);
}
if (!existsSync(resolve(sourceDist, "index.html"))) {
  throw new Error(`构建结束但没有找到网页入口：${sourceDist}`);
}

mkdirSync(publicRoot, { recursive: true });
rmSync(stagedTarget, { recursive: true, force: true });
rmSync(previousTarget, { recursive: true, force: true });
cpSync(sourceDist, stagedTarget, { recursive: true });

if (existsSync(publicTarget)) {
  renameSync(publicTarget, previousTarget);
}
try {
  renameSync(stagedTarget, publicTarget);
  rmSync(previousTarget, { recursive: true, force: true });
} catch (error) {
  if (existsSync(previousTarget) && !existsSync(publicTarget)) {
    renameSync(previousTarget, publicTarget);
  }
  throw error;
}

console.log(`GeoLibre 已由项目内源码生成：${publicTarget}`);
