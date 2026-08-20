import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    ".vercel/**",
    ".temp/**",
    ".deploy-source-repo/**",
    ".deploy-static/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "vendor/**",
    "public/gaussian-viewer/vendor/**",
    "public/vendor/cesium/**",
  ]),
]);
