# GitHub Pages Public Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the current Hongtang platform as a public GitHub Pages site without exposing local environment files or breaking local/Vercel execution.

**Architecture:** Build a temporary static-export copy of the Next.js application, remove server-only routes from that copy, inject browser-visible runtime configuration from GitHub Secrets, and deploy the resulting `out` directory with GitHub Actions. A single base-path helper keeps project-page URLs valid while remaining a no-op locally.

**Tech Stack:** Next.js 16, React 19, Node.js 24, GitHub Actions, GitHub Pages, Supabase client, CesiumJS.

**Spec:** `docs/superpowers/specs/2026-08-20-github-pages-design.md`

## Global Constraints

- Preserve local development and Vercel behavior.
- Do not commit environment files or secret values.
- Use `/hongtang-sustainable-development-platform` only when `GITHUB_PAGES=true`.
- Continue loading the production 3D model from Cesium Ion.
- Publish only after typecheck, lint, project verifiers, static build, and secret scan succeed.

---

### Task 1: Static path and runtime configuration contract

**Files:**
- Create: `src/lib/sitePath.ts`
- Create: `scripts/verify-github-pages.mjs`
- Modify: `src/lib/platformData.ts`
- Modify: `src/lib/amap.ts`
- Modify: `src/components/home/GaussianHome.tsx`
- Modify: `src/components/home/HomeExperience.tsx`
- Modify: `src/components/map/VillageMap.tsx`

**Interfaces:**
- Produces: `sitePath(path: string): string`
- Consumes: `NEXT_PUBLIC_SITE_BASE_PATH`, `NEXT_PUBLIC_AMAP_WEB_KEY`, `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`

- [ ] Write `verify-github-pages.mjs` assertions for repository base-path behavior and run it to observe failure because `sitePath.ts` does not exist.
- [ ] Implement `sitePath()` with normalization for empty, root and repository prefixes.
- [ ] Route dataset fallbacks, public images, iframe URLs and map configuration requests through `sitePath()`.
- [ ] Add static high德 configuration support while preserving API fallback.
- [ ] Run the verifier and existing typecheck/lint commands until green.

### Task 2: Cesium Pages runtime and isolated static builder

**Files:**
- Create: `scripts/build-github-pages.mjs`
- Modify: `public/cesium-viewer/index.html`
- Modify: `next.config.ts`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: `CESIUM_ION_TOKEN`, `NEXT_PUBLIC_*`, `GITHUB_PAGES=true`
- Produces: `out/` and `public/config/pages-runtime-config.js` inside the temporary build copy

- [ ] Extend the Pages verifier with assertions for conditional static export, runtime configuration and the build command; run it to observe expected failure.
- [ ] Add conditional Next.js static-export settings.
- [ ] Make the Cesium viewer derive the repository base path and prefer generated browser runtime configuration.
- [ ] Implement a Node build script that copies the project, excludes server routes and local build folders, writes the runtime config, builds, copies `out`, and cleans up.
- [ ] Run the verifier and perform a complete local Pages build.

### Task 3: GitHub Actions publication

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes GitHub Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `AMAP_WEB_KEY`, `AMAP_SECURITY_JS_CODE`, `CESIUM_ION_TOKEN`
- Produces: GitHub Pages deployment artifact and public page URL

- [ ] Extend the verifier with workflow assertions and run it to observe expected failure.
- [ ] Add a workflow using `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages`.
- [ ] Document the GitHub Pages URL and the difference between local, Vercel and Pages publication.
- [ ] Run the verifier, typecheck, lint and static build.

### Task 4: Publish and verify

**Files:**
- Stage only confirmed platform and workflow paths.

**Interfaces:**
- Produces: public repository and enabled GitHub Pages site.

- [ ] Scan tracked and staged files for environment files and common secret patterns without printing secret values.
- [ ] Commit the verified current platform snapshot and Pages publication changes.
- [ ] Fast-forward `main`, push it, and change repository visibility to public.
- [ ] Set GitHub Actions secrets from ignored local environment files without echoing their values.
- [ ] Enable Pages with `build_type=workflow` and monitor the deployment action.
- [ ] Verify the public homepage, map editor route, Cesium viewer and representative data files over HTTPS.
