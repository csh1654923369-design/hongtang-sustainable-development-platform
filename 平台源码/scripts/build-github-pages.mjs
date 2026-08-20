import { spawn } from "node:child_process";
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryBasePath = "/hongtang-sustainable-development-platform";

export function createPagesRuntimeConfig(env = process.env) {
  return {
    cesiumIonToken: env.CESIUM_ION_TOKEN || "",
    cesiumAssetId: Number(env.CESIUM_ION_ASSET_ID || 5139056),
    cesiumTerrainAssetId: Number(env.CESIUM_TERRAIN_ASSET_ID || 1),
    cesiumImageryAssetId: Number(env.CESIUM_IMAGERY_ASSET_ID || 2),
  };
}

function shouldCopy(source) {
  const relative = path.relative(projectRoot, source);
  if (!relative) return true;

  const firstSegment = relative.split(path.sep)[0];
  return !new Set([
    ".agents",
    ".codex",
    ".deploy-source-repo",
    ".deploy-static",
    ".git",
    ".github",
    ".next",
    ".pages-build",
    ".qa",
    ".temp",
    ".vercel",
    "node_modules",
    "out",
    "vendor",
  ]).has(firstSegment);
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

export async function buildGithubPages(env = process.env) {
  const temporaryRoot = path.join(projectRoot, ".pages-build");
  const outputRoot = path.join(projectRoot, "out");

  await rm(temporaryRoot, { recursive: true, force: true });
  await mkdir(temporaryRoot, { recursive: true });

  try {
    const entries = await readdir(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      const source = path.join(projectRoot, entry.name);
      if (!shouldCopy(source)) continue;
      await cp(source, path.join(temporaryRoot, entry.name), {
        recursive: true,
        filter: shouldCopy,
      });
    }

    await rm(path.join(temporaryRoot, "src", "app", "api"), {
      recursive: true,
      force: true,
    });
    await rm(path.join(temporaryRoot, "src", "app", "_AMapService"), {
      recursive: true,
      force: true,
    });

    const configDirectory = path.join(temporaryRoot, "public", "config");
    await mkdir(configDirectory, { recursive: true });
    await writeFile(
      path.join(configDirectory, "pages-runtime-config.js"),
      `window.__HONGTANG_PAGES_CONFIG__ = ${JSON.stringify(createPagesRuntimeConfig(env))};\n`,
      "utf8",
    );

    const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
    await run(process.execPath, [nextCli, "build", "--webpack"], {
      cwd: temporaryRoot,
      env: {
        ...env,
        GITHUB_PAGES: "true",
        NEXT_PUBLIC_SITE_BASE_PATH: repositoryBasePath,
        NEXT_PUBLIC_AMAP_WEB_KEY:
          env.NEXT_PUBLIC_AMAP_WEB_KEY || env.AMAP_WEB_KEY || "",
        NEXT_PUBLIC_AMAP_SECURITY_JS_CODE:
          env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE || env.AMAP_SECURITY_JS_CODE || "",
      },
    });

    await rm(outputRoot, { recursive: true, force: true });
    await cp(path.join(temporaryRoot, "out"), outputRoot, { recursive: true });
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  buildGithubPages().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
