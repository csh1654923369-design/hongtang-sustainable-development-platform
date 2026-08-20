import assert from "node:assert/strict";
import test from "node:test";

async function loadSitePathModule() {
  try {
    return await import("../src/lib/sitePath.ts");
  } catch {
    return {};
  }
}

test("project-page assets receive exactly one normalized base path", async () => {
  const { resolveSitePath } = await loadSitePathModule();
  assert.equal(typeof resolveSitePath, "function", "resolveSitePath must be implemented");
  assert.equal(resolveSitePath("/data/map.json", ""), "/data/map.json");
  assert.equal(
    resolveSitePath("/data/map.json", "/hongtang-sustainable-development-platform/"),
    "/hongtang-sustainable-development-platform/data/map.json",
  );
  assert.equal(
    resolveSitePath(
      "/hongtang-sustainable-development-platform/data/map.json",
      "/hongtang-sustainable-development-platform",
    ),
    "/hongtang-sustainable-development-platform/data/map.json",
  );
  assert.equal(
    resolveSitePath("https://example.com/map.json", "/hongtang-sustainable-development-platform"),
    "https://example.com/map.json",
  );
});

test("GitHub Pages mode produces a repository-scoped static Next.js export", async () => {
  const previous = process.env.GITHUB_PAGES;
  process.env.GITHUB_PAGES = "true";
  try {
    const { default: config } = await import(`../next.config.ts?pages-test=${Date.now()}`);
    assert.equal(config.output, "export");
    assert.equal(config.basePath, "/hongtang-sustainable-development-platform");
    assert.equal(config.assetPrefix, "/hongtang-sustainable-development-platform");
    assert.equal(config.trailingSlash, true);
    assert.equal(config.images?.unoptimized, true);
  } finally {
    if (previous === undefined) delete process.env.GITHUB_PAGES;
    else process.env.GITHUB_PAGES = previous;
  }
});

test("Pages runtime config exposes only browser-safe map settings", async () => {
  let createPagesRuntimeConfig;
  try {
    ({ createPagesRuntimeConfig } = await import("./build-github-pages.mjs"));
  } catch {
    // The assertion below reports the missing production interface as a test failure.
  }
  assert.equal(typeof createPagesRuntimeConfig, "function", "createPagesRuntimeConfig must be implemented");
  assert.deepEqual(
    createPagesRuntimeConfig({
      CESIUM_ION_TOKEN: "cesium-public-token",
      AMAP_WEB_KEY: "amap-web-key",
      AMAP_SECURITY_JS_CODE: "amap-browser-security-code",
      SUPABASE_SERVICE_ROLE_KEY: "must-not-leak",
    }),
    {
      cesiumIonToken: "cesium-public-token",
      cesiumAssetId: 5_139_056,
      cesiumTerrainAssetId: 1,
      cesiumImageryAssetId: 2,
    },
  );
});
