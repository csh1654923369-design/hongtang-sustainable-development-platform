import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const platformRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(platformRoot, "vendor", "geolibre");
const packagePath = resolve(sourceRoot, "package.json");

for (const relativePath of [
  "LICENSE",
  "package-lock.json",
  "apps/geolibre-desktop/src/App.tsx",
  "apps/geolibre-desktop/vite.config.ts",
  "packages/core/src/index.ts",
  "backend/geolibre_server/pyproject.toml",
]) {
  assert(existsSync(resolve(sourceRoot, relativePath)), `缺少 GeoLibre 源码文件：${relativePath}`);
}

const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
assert.equal(packageJson.name, "geolibre");
assert.equal(packageJson.version, "2.5.0");

console.log(
  JSON.stringify(
    {
      status: "passed",
      sourceRoot,
      version: packageJson.version,
      runtimeEntry: "/geolibre/index.html",
    },
    null,
    2,
  ),
);
