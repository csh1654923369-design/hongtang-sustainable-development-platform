import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const sourceRoot = resolve(import.meta.dirname, "..");
const payload = JSON.parse(
  readFileSync(resolve(sourceRoot, "public/data/hongtang-real-map-features.json"), "utf8"),
);
const photos = payload.features.flatMap((feature) =>
  (feature.imageUrls ?? []).map((url) => ({ featureId: feature.id, url })),
);

assert.equal(payload.meta.photoStorage, "local-webp");
assert.equal(photos.length, 586);
assert.equal(new Set(photos.map((photo) => photo.url)).size, photos.length);

for (const photo of photos) {
  assert.match(photo.url, /^\/local-photos\/(poi|village)\/[a-f0-9]{24}\.webp$/);
  const path = resolve(sourceRoot, "public", photo.url.slice(1));
  assert(statSync(path).size > 512, `${photo.featureId}: ${photo.url} should be a non-empty local photo`);
}

console.log(JSON.stringify({ status: "passed", photos: photos.length }, null, 2));
