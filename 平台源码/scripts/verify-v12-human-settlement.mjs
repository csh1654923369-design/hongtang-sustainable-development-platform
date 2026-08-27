import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const framework = read("src/lib/humanSettlement.ts");
const home = read("src/components/home/HomeExperience.tsx");
const navigator = read("src/components/map/SettlementTopicNavigator.tsx");
const detail = read("src/components/map/HumanSettlementDetail.tsx");
const editor = read("src/components/map-editor/MapDataEditor.tsx");
const packageJson = JSON.parse(read("package.json"));

assert.equal(packageJson.version, "1.2.0", "V1.2 package version must be 1.2.0");
assert.equal(existsSync(join(root, "src/components/map/WaterTopicNavigator.tsx")), false, "legacy single-topic navigator should be removed");

for (const topicId of ["garden", "tea", "water", "safety", "history"]) {
  assert.match(framework, new RegExp(`\\b${topicId}: \\{`), `missing ${topicId} topic framework`);
}
for (const systemId of ["nature", "life", "community", "dwelling", "support"]) {
  assert.match(framework, new RegExp(`\\b${systemId}: \\{`), `missing ${systemId} human-settlement system`);
}

assert.match(home, /topicLensId/);
assert.match(home, /settlementScale/);
assert.match(navigator, /看多大范围/);
assert.match(navigator, /这个问题还连接/);
assert.match(detail, /资料依据/);
assert.match(detail, /它与什么有关/);
assert.match(detail, /当前进度/);
assert.match(detail, /补充或核实/);
assert.match(editor, /核实、关系与行动/);
assert.match(editor, /evidenceStatus/);
assert.match(editor, /actionStage/);
assert.match(editor, /HISTORY_LIMIT = 5/);

console.log(JSON.stringify({
  status: "passed",
  version: packageJson.version,
  topics: 5,
  humanSettlementSystems: 5,
  sharedViews: ["2D", "3D", "editor"],
  workflow: ["evidence", "relationship", "time", "action"],
}, null, 2));
