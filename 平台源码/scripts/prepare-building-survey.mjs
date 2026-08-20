import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourceRoot = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(projectRoot, "..", "平台素材", "地图原始数据");

const footprintsPath = path.join(sourceRoot, "building_footprints.geojson");
const attributesPath = path.join(sourceRoot, "building_attributes.json");
const outputPath = path.join(projectRoot, "public", "data", "hongtang-building-survey.json");

const [footprints, attributePayload] = await Promise.all([
  readFile(footprintsPath, "utf8").then(JSON.parse),
  readFile(attributesPath, "utf8").then(JSON.parse),
]);

const records = attributePayload.records ?? attributePayload;
const sourceFeatures = footprints.features.filter(
  (feature) => feature.geometry?.type === "Polygon" && feature.geometry.coordinates?.[0]?.length >= 4,
);

const bounds = sourceFeatures.reduce(
  (current, feature) => {
    for (const [longitude, latitude] of feature.geometry.coordinates[0]) {
      current.minLongitude = Math.min(current.minLongitude, longitude);
      current.maxLongitude = Math.max(current.maxLongitude, longitude);
      current.minLatitude = Math.min(current.minLatitude, latitude);
      current.maxLatitude = Math.max(current.maxLatitude, latitude);
    }
    return current;
  },
  {
    minLongitude: Number.POSITIVE_INFINITY,
    maxLongitude: Number.NEGATIVE_INFINITY,
    minLatitude: Number.POSITIVE_INFINITY,
    maxLatitude: Number.NEGATIVE_INFINITY,
  },
);

const centerLatitude = (bounds.minLatitude + bounds.maxLatitude) / 2;
const longitudeRange = bounds.maxLongitude - bounds.minLongitude;
const latitudeRange = bounds.maxLatitude - bounds.minLatitude;
const metricAspect = (longitudeRange * Math.cos((centerLatitude * Math.PI) / 180)) / latitudeRange;
const canvasHeight = 1000;
const canvasWidth = Math.max(620, Math.round(canvasHeight * metricAspect));
const padding = 26;

const round = (value, digits = 2) => Number(value.toFixed(digits));
const projectPoint = ([longitude, latitude]) => ({
  x: padding + ((longitude - bounds.minLongitude) / longitudeRange) * (canvasWidth - padding * 2),
  y: padding + ((bounds.maxLatitude - latitude) / latitudeRange) * (canvasHeight - padding * 2),
});

function polygonAreaSquareMeters(ring) {
  const [originLongitude, originLatitude] = ring[0];
  const longitudeMeters = 111_320 * Math.cos((centerLatitude * Math.PI) / 180);
  const latitudeMeters = 110_540;
  const local = ring.map(([longitude, latitude]) => [
    (longitude - originLongitude) * longitudeMeters,
    (latitude - originLatitude) * latitudeMeters,
  ]);
  let twiceArea = 0;
  for (let index = 0; index < local.length - 1; index += 1) {
    twiceArea += local[index][0] * local[index + 1][1] - local[index + 1][0] * local[index][1];
  }
  return Math.abs(twiceArea) / 2;
}

function ringCenter(ring) {
  const points = ring.slice(0, -1);
  const sum = points.reduce(
    (current, [longitude, latitude]) => ({
      longitude: current.longitude + longitude,
      latitude: current.latitude + latitude,
    }),
    { longitude: 0, latitude: 0 },
  );
  return {
    longitude: sum.longitude / points.length,
    latitude: sum.latitude / points.length,
  };
}

const buildings = sourceFeatures.map((feature) => {
  const id = String(feature.properties?.id ?? "");
  const record = records[id] ?? {};
  const ring = feature.geometry.coordinates[0];
  const projected = ring.map(projectPoint);
  const center = ringCenter(ring);
  const projectedCenter = projectPoint([center.longitude, center.latitude]);
  const height = Number(
    record.building_height_m ?? feature.properties?.source_height ?? feature.properties?.height ?? 0,
  );
  const kind = record.house_type === "old" ? "old" : "new";
  const pathData = projected
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${round(x)} ${round(y)}`)
    .join(" ");

  return {
    id,
    kind,
    heightM: round(height, 1),
    areaM2: round(polygonAreaSquareMeters(ring), 1),
    center: {
      x: round(projectedCenter.x),
      y: round(projectedCenter.y),
      longitude: round(center.longitude, 6),
      latitude: round(center.latitude, 6),
    },
    path: `${pathData} Z`,
  };
});

const heightValues = buildings.map((building) => building.heightM).filter(Number.isFinite);
const oldCount = buildings.filter((building) => building.kind === "old").length;
const output = {
  meta: {
    title: "红塘村建筑调研底图",
    source: "../平台素材/地图原始数据/building_footprints.geojson + building_attributes.json",
    sourceGeneratedAt: attributePayload.generated_at ?? null,
    generatedAt: new Date().toISOString().slice(0, 10),
    privacyNote: "仅保留建筑编号、轮廓、类型、高度与由轮廓计算的占地面积；未导入户主、住址、家庭成员和人口等个人调查字段。",
    buildingCount: buildings.length,
    bounds: {
      minLongitude: round(bounds.minLongitude, 6),
      maxLongitude: round(bounds.maxLongitude, 6),
      minLatitude: round(bounds.minLatitude, 6),
      maxLatitude: round(bounds.maxLatitude, 6),
    },
    stats: {
      oldCount,
      newCount: buildings.length - oldCount,
      averageHeightM: round(heightValues.reduce((sum, value) => sum + value, 0) / heightValues.length, 1),
    },
  },
  canvas: { width: canvasWidth, height: canvasHeight },
  buildings,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(output), "utf8");
console.log(`Prepared ${buildings.length} privacy-safe buildings at ${outputPath}`);
