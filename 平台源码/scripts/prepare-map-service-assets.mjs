import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const materialRoot = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(projectRoot, "..", "平台素材", "地图服务素材");
const publicDataRoot = path.join(projectRoot, "public", "data");
const rawBuildingPath = path.join(materialRoot, "红塘村建筑图层_WFS_原始.geojson");
const handDrawnPath = path.join(materialRoot, "红塘村手绘图层_WMS_2048x2870.png");
const safeBuildingPath = path.join(publicDataRoot, "hongtang-buildings-safe.geojson");
const publicHandDrawnPath = path.join(publicDataRoot, "hongtang-handdrawn-map.png");
const publicLayerManifestPath = path.join(publicDataRoot, "hongtang-map-layers.json");

const rawCollection = JSON.parse(await readFile(rawBuildingPath, "utf8"));
const round = (value, digits = 2) => Number(value.toFixed(digits));
const centerLatitude = (rawCollection.bbox[1] + rawCollection.bbox[3]) / 2;
const longitudeMeters = 111_320 * Math.cos((centerLatitude * Math.PI) / 180);
const latitudeMeters = 110_540;

function polygonRings(geometry) {
  if (geometry?.type === "Polygon") return [geometry.coordinates];
  if (geometry?.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function ringAreaSquareMeters(ring) {
  if (!ring?.length) return 0;
  const [originLongitude, originLatitude] = ring[0];
  const local = ring.map(([longitude, latitude]) => [
    (longitude - originLongitude) * longitudeMeters,
    (latitude - originLatitude) * latitudeMeters,
  ]);
  let twiceArea = 0;
  for (let index = 0; index < local.length - 1; index += 1) {
    twiceArea += local[index][0] * local[index + 1][1]
      - local[index + 1][0] * local[index][1];
  }
  return Math.abs(twiceArea) / 2;
}

function geometryAreaSquareMeters(geometry) {
  return polygonRings(geometry).reduce((total, polygon) => {
    const [outer, ...holes] = polygon;
    const outerArea = ringAreaSquareMeters(outer);
    const holeArea = holes.reduce((sum, ring) => sum + ringAreaSquareMeters(ring), 0);
    return total + Math.max(0, outerArea - holeArea);
  }, 0);
}

function geometryCenter(geometry) {
  const points = polygonRings(geometry)
    .flatMap((polygon) => polygon[0]?.slice(0, -1) ?? []);
  const totals = points.reduce(
    (current, [longitude, latitude]) => ({
      longitude: current.longitude + longitude,
      latitude: current.latitude + latitude,
    }),
    { longitude: 0, latitude: 0 },
  );
  return {
    longitude: totals.longitude / points.length,
    latitude: totals.latitude / points.length,
  };
}

const sourceFeatures = rawCollection.features.filter(
  (feature) => polygonRings(feature.geometry).length > 0,
);
const safeFeatures = sourceFeatures.map((feature, index) => {
  const rawProperties = feature.properties ?? {};
  const center = geometryCenter(feature.geometry);
  const rawId = String(feature.id ?? "").split(".").at(-1);
  const id = /^\d+$/.test(rawId) ? rawId : String(index + 1);
  const kind = rawProperties.house_type === "old" || rawProperties.type === "old"
    ? "old"
    : "new";
  const heightM = Number(rawProperties.height);
  return {
    type: "Feature",
    id: `building-${id}`,
    geometry: feature.geometry,
    properties: {
      id,
      kind,
      heightM: round(Number.isFinite(heightM) ? heightM : 0, 1),
      areaM2: round(geometryAreaSquareMeters(feature.geometry), 1),
      centerLongitude: round(center.longitude, 6),
      centerLatitude: round(center.latitude, 6),
    },
  };
});

const heightValues = safeFeatures
  .map((feature) => feature.properties.heightM)
  .filter((value) => Number.isFinite(value));
const oldCount = safeFeatures.filter(
  (feature) => feature.properties.kind === "old",
).length;
const safeCollection = {
  type: "FeatureCollection",
  meta: {
    title: "红塘村建筑安全查询图层",
    source: "../平台素材/地图服务素材/红塘村建筑图层_WFS_原始.geojson",
    sourceGeneratedAt: rawCollection.timeStamp ?? null,
    generatedAt: new Date().toISOString().slice(0, 10),
    privacyNote: "只保留建筑编号、新旧类型、高度、估算占地、中心坐标和几何轮廓；不包含姓名、电话、住址、家庭成员和人口等字段。",
    buildingCount: safeFeatures.length,
    stats: {
      oldCount,
      newCount: safeFeatures.length - oldCount,
      averageHeightM: round(
        heightValues.reduce((sum, value) => sum + value, 0) / heightValues.length,
        1,
      ),
    },
  },
  bbox: rawCollection.bbox,
  features: safeFeatures,
};

const layerManifest = {
  coordinateSystem: "EPSG:4326",
  layers: [
    {
      id: "hongtang-hand-drawn",
      title: "红塘村手绘图",
      type: "image",
      image: "/data/hongtang-handdrawn-map.png",
      width: 2048,
      height: 2870,
      bounds: [
        [24.626466269999977, 99.87903589790675],
        [24.685577823254807, 99.92124683196907],
      ],
    },
    {
      id: "hongtang-buildings",
      title: "红塘村建筑",
      type: "geojson",
      data: "/data/hongtang-buildings-safe.geojson",
      featureCount: safeFeatures.length,
      bounds: [
        [rawCollection.bbox[1], rawCollection.bbox[0]],
        [rawCollection.bbox[3], rawCollection.bbox[2]],
      ],
    },
  ],
};

await mkdir(publicDataRoot, { recursive: true });
await Promise.all([
  writeFile(safeBuildingPath, JSON.stringify(safeCollection), "utf8"),
  writeFile(publicLayerManifestPath, JSON.stringify(layerManifest, null, 2), "utf8"),
  copyFile(handDrawnPath, publicHandDrawnPath),
]);

console.log(`Prepared ${safeFeatures.length} privacy-safe buildings at ${safeBuildingPath}`);
console.log(`Copied hand-drawn map to ${publicHandDrawnPath}`);
