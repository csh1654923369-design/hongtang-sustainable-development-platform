import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";


function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(".env.production.local");
loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url, "NEXT_PUBLIC_SUPABASE_URL is required");
assert.ok(key, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required");

const response = await fetch(
  `${url}/rest/v1/platform_datasets?select=slug,payload&is_public=eq.true&order=slug`,
  { headers: { apikey: key } },
);
assert.equal(response.status, 200, `Supabase dataset request failed: ${response.status}`);
const rows = await response.json();
assert.deepEqual(
  rows.map((row) => row.slug),
  ["hongtang-real-map-features", "hongtang-topic-records", "hongtang-water-system"],
);

const map = rows.find((row) => row.slug === "hongtang-real-map-features").payload;
assert.equal(map.features.length, 204);
assert.equal(map.features.some((feature) => feature.id === "real-poi-13"), false);
assert.equal(map.features.some((feature) => feature.featureType === "ecology"), false);
const topicRecords = rows.find((row) => row.slug === "hongtang-topic-records").payload.records;
assert.deepEqual(topicRecords, []);
const water = rows.find((row) => row.slug === "hongtang-water-system").payload;
assert.match(water.title, /手绘水系校正/);
assert.equal(water.nodes.length, 7);
assert.equal(water.lines.length, 7);
assert.equal(water.lines.filter((line) => line.system === "drainage").length, 4);
assert.equal(water.lines.some((line) => line.id === "water-branch-east"), false);
assert.deepEqual(water.lines.find((line) => line.id === "water-line-outlet").path.at(-1), [99.90704, 24.63181]);
const photoUrl = map.features.flatMap((feature) => feature.imageUrls ?? [])[0];
assert.ok(photoUrl.startsWith(`${url}/storage/v1/object/public/hongtang-photos/`));
const photoResponse = await fetch(photoUrl, { method: "HEAD" });
assert.equal(photoResponse.status, 200);
assert.equal(photoResponse.headers.get("content-type"), "image/webp");

console.log(JSON.stringify({ status: "passed", datasets: rows.length, features: map.features.length, photoStatus: photoResponse.status }, null, 2));
