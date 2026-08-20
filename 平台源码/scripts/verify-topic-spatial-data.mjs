import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile(new URL("../public/data/hongtang-topic-spatial-demo.json", import.meta.url), "utf8"));
const layers = new Map(data.layers.map((layer) => [layer.id, layer]));

assert.equal(data.layers.length, 7);
assert.equal(data.features.length, 18);
assert(data.features.every((feature) => feature.isDemo === true && feature.status.includes("待")));
assert(data.features.every((feature) => layers.get(feature.layerId)?.topicId === feature.topicId));
assert(data.layers.every((layer) => Array.isArray(layer.fields) && layer.fields.length > 0));

const geometryByTopic = (topicId) => new Set(data.layers.filter((layer) => layer.topicId === topicId).map((layer) => layer.geometryType));
assert.deepEqual([...geometryByTopic("garden")], [], "小花园不得包含额外线面试验图层");
assert.equal(data.features.filter((feature) => feature.topicId === "garden").length, 0);
assert.deepEqual([...geometryByTopic("tea")].sort(), ["line", "point", "polygon"]);
assert.deepEqual([...geometryByTopic("safety")], ["point"], "塌方与安全专题只能创建点要素");
assert.deepEqual([...geometryByTopic("history")].sort(), ["line", "point", "polygon"]);

for (const id of ["tea-monitoring-sites", "tea-leaf-routes", "safety-risk-sites", "history-sites", "tea-horse-trail"]) {
  assert(layers.has(id), `missing layer: ${id}`);
  assert(data.features.some((feature) => feature.layerId === id), `layer has no demo feature: ${id}`);
}

console.log(JSON.stringify({ status: "passed", layers: data.layers.length, features: data.features.length, gardenPointOnly: true, safetyGeometry: [...geometryByTopic("safety")] }, null, 2));
