const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

type JsonRecord = Record<string, unknown>;

type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

type GeoJsonFeature = {
  type: "Feature";
  id: string;
  geometry: GeoJsonGeometry;
  properties: JsonRecord;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

type PlatformDatasetRow = {
  slug: string;
  payload: JsonRecord;
  updated_at: string;
};

type LayerDefinition = {
  id: string;
  name: string;
  color: string;
  fillOpacity?: number;
  circleRadius?: number;
  features: GeoJsonFeature[];
};

const datasetSlugs = [
  "hongtang-real-map-features",
  "hongtang-water-system",
];

const typeLabels: Record<string, string> = {
  garden: "小花园",
  "tea-factory": "茶产业",
  "water-facility": "村里用水",
  "public-service": "公共服务设施",
  "research-photo": "村景记录",
};

const layerOrder = [
  "water-system-zones",
  "water-system-lines",
  "water-system-nodes",
  "garden-points",
  "tea-points",
  "water-facility-points",
  "public-service-points",
  "village-record-points",
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function scalar(value: unknown): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => String(item)).join("；");
  return JSON.stringify(value);
}

function pointGeometry(record: JsonRecord): GeoJsonGeometry | null {
  const geometry = record.geometry as GeoJsonGeometry | undefined;
  if (geometry?.type && geometry.coordinates) return geometry;

  const longitude = Number(record.longitude);
  const latitude = Number(record.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  return { type: "Point", coordinates: [longitude, latitude] };
}

function platformFeatureToGeoJson(record: JsonRecord): GeoJsonFeature | null {
  const geometry = pointGeometry(record);
  const id = String(record.id ?? "");
  if (!geometry || !id) return null;

  const imageUrls = Array.isArray(record.imageUrls) ? record.imageUrls : [];
  const featureType = String(record.featureType ?? "");

  return {
    type: "Feature",
    id,
    geometry,
    properties: {
      平台编号: id,
      名称: scalar(record.title),
      类别: typeLabels[featureType] ?? featureType,
      状态: scalar(record.status),
      位置: scalar(record.location),
      说明: scalar(record.description),
      更新时间: scalar(record.updatedAt),
      照片数量: imageUrls.length,
      首张照片: scalar(imageUrls[0]),
      _id: id,
      _featureType: featureType,
    },
  };
}

function waterNodeToGeoJson(record: JsonRecord): GeoJsonFeature | null {
  const geometry = pointGeometry(record);
  const id = String(record.id ?? "");
  if (!geometry || !id) return null;

  return {
    type: "Feature",
    id,
    geometry,
    properties: {
      平台编号: id,
      名称: scalar(record.title),
      类型: scalar(record.kind),
      系统: record.system === "supply" ? "供水" : "排水",
      状态: scalar(record.status),
      位置: scalar(record.location),
      说明: scalar(record.description),
      海拔: scalar(record.elevation),
      功能: scalar(record.functions),
      维护事项: scalar(record.maintenance),
      待核实问题: scalar(record.openQuestions),
      _id: id,
      _featureType: "water-system-node",
    },
  };
}

function waterLineToGeoJson(record: JsonRecord): GeoJsonFeature | null {
  const path = Array.isArray(record.path) ? record.path : [];
  const id = String(record.id ?? "");
  if (!id || path.length < 2) return null;

  return {
    type: "Feature",
    id,
    geometry: { type: "LineString", coordinates: path },
    properties: {
      平台编号: id,
      名称: scalar(record.title),
      类型: scalar(record.kind),
      系统: record.system === "supply" ? "供水" : "排水",
      状态: scalar(record.status),
      位置: scalar(record.location),
      说明: scalar(record.description),
      流向说明: scalar(record.flowDescription),
      高差米: scalar(record.dropMeters),
      起点编号: scalar(record.fromNodeId),
      终点编号: scalar(record.toNodeId),
      服务分区: scalar(record.servedZoneIds),
      维护事项: scalar(record.maintenance),
      待核实问题: scalar(record.openQuestions),
      _id: id,
      _featureType: "water-system-line",
    },
  };
}

function waterZoneToGeoJson(record: JsonRecord): GeoJsonFeature | null {
  const polygon = Array.isArray(record.polygon) ? record.polygon : [];
  const id = String(record.id ?? "");
  if (!id || polygon.length < 3) return null;

  const first = polygon[0];
  const last = polygon[polygon.length - 1];
  const closedPolygon = JSON.stringify(first) === JSON.stringify(last)
    ? polygon
    : [...polygon, first];

  return {
    type: "Feature",
    id,
    geometry: { type: "Polygon", coordinates: [closedPolygon] },
    properties: {
      平台编号: id,
      名称: scalar(record.title),
      类型: "供水分区",
      状态: scalar(record.status),
      位置: scalar(record.location),
      说明: scalar(record.description),
      供水节点: scalar(record.supplyNodeId),
      水源节点: scalar(record.sourceNodeIds),
      供水线路: scalar(record.routeLineIds),
      服务用途: scalar(record.servedUses),
      维护事项: scalar(record.maintenance),
      待核实问题: scalar(record.openQuestions),
      _id: id,
      _featureType: "water-system-zone",
    },
  };
}

function layerStyle(color: string, fillOpacity = 0.38, circleRadius = 7) {
  return {
    minZoom: 0,
    maxZoom: 24,
    fillColor: color,
    strokeColor: color,
    strokeWidth: 2.4,
    strokeWidthUnit: "pixels",
    fillOpacity,
    circleRadius,
    rasterBrightnessMin: 0,
    rasterBrightnessMax: 1,
    rasterSaturation: 0,
    rasterContrast: 0,
    rasterHueRotate: 0,
  };
}

function createLayer(layer: LayerDefinition) {
  const style = layerStyle(
    layer.color,
    layer.fillOpacity ?? 0.38,
    layer.circleRadius ?? 7,
  );

  return {
    id: layer.id,
    name: `${layer.name}（${layer.features.length}）`,
    type: "geojson",
    source: { type: "geojson" },
    visible: true,
    opacity: 1,
    style,
    metadata: {
      sourceKind: "supabase-platform-datasets",
      experimental: true,
      identifiable: true,
    },
    geojson: {
      type: "FeatureCollection",
      features: layer.features,
    },
  };
}

async function fetchDatasets(): Promise<Map<string, PlatformDatasetRow>> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase 环境变量尚未配置");
  }

  const query = encodeURIComponent(`(${datasetSlugs.join(",")})`);
  const response = await fetch(
    `${supabaseUrl}/rest/v1/platform_datasets?select=slug,payload,updated_at&slug=in.${query}&is_public=eq.true`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`读取平台数据失败（${response.status}）`);
  }

  const rows = await response.json() as PlatformDatasetRow[];
  return new Map(rows.map((row) => [row.slug, row]));
}

function buildLayerDefinitions(datasets: Map<string, PlatformDatasetRow>): LayerDefinition[] {
  const mapPayload = datasets.get("hongtang-real-map-features")?.payload;
  const waterPayload = datasets.get("hongtang-water-system")?.payload;
  if (!mapPayload || !waterPayload) {
    throw new Error("Supabase 中缺少红塘地图或水专题数据");
  }

  const platformFeatures = Array.isArray(mapPayload.features)
    ? mapPayload.features as JsonRecord[]
    : [];
  const byType = (featureType: string) => platformFeatures
    .filter((item) => item.featureType === featureType)
    .map(platformFeatureToGeoJson)
    .filter((item): item is GeoJsonFeature => Boolean(item));

  const waterNodes = (Array.isArray(waterPayload.nodes) ? waterPayload.nodes : [])
    .map((item) => waterNodeToGeoJson(item as JsonRecord))
    .filter((item): item is GeoJsonFeature => Boolean(item));
  const waterLines = (Array.isArray(waterPayload.lines) ? waterPayload.lines : [])
    .map((item) => waterLineToGeoJson(item as JsonRecord))
    .filter((item): item is GeoJsonFeature => Boolean(item));
  const waterZones = (Array.isArray(waterPayload.zones) ? waterPayload.zones : [])
    .map((item) => waterZoneToGeoJson(item as JsonRecord))
    .filter((item): item is GeoJsonFeature => Boolean(item));

  return [
    { id: "water-system-zones", name: "供水分区", color: "#39758a", fillOpacity: 0.28, features: waterZones },
    { id: "water-system-lines", name: "水系统线路", color: "#2c7ea0", fillOpacity: 0.72, features: waterLines },
    { id: "water-system-nodes", name: "水系统节点", color: "#39758a", circleRadius: 8, features: waterNodes },
    { id: "garden-points", name: "小花园", color: "#4f8d55", circleRadius: 7, features: byType("garden") },
    { id: "tea-points", name: "茶产业", color: "#9a7138", circleRadius: 7, features: byType("tea-factory") },
    { id: "water-facility-points", name: "村里用水设施", color: "#39758a", circleRadius: 7, features: byType("water-facility") },
    { id: "public-service-points", name: "公共服务设施", color: "#4e80a0", circleRadius: 7, features: byType("public-service") },
    { id: "village-record-points", name: "村景记录", color: "#a26789", circleRadius: 4, features: byType("research-photo") },
  ];
}

function buildProject(datasets: Map<string, PlatformDatasetRow>, definitions: LayerDefinition[]) {
  const layers = definitions
    .sort((a, b) => layerOrder.indexOf(a.id) - layerOrder.indexOf(b.id))
    .map(createLayer);
  const styles = Object.fromEntries(layers.map((layer) => [layer.id, layer.style]));
  const updatedAt = [...datasets.values()]
    .map((row) => row.updated_at)
    .sort()
    .at(-1) ?? new Date().toISOString();

  return {
    version: "0.1.0",
    name: "红塘村空间数据实验项目",
    mapView: {
      center: [99.908740607, 24.636255278],
      zoom: 14.8,
      bearing: 0,
      pitch: 0,
    },
    basemapStyleUrl: "https://tiles.openfreemap.org/styles/positron",
    basemapVisible: true,
    basemapOpacity: 0.82,
    layers,
    styles,
    plugins: {
      manifestUrls: [],
      activePluginIds: [
        "maplibre-layer-control",
        "maplibre-gl-basemap-control",
        "maplibre-gl-geo-editor",
      ],
      mapControlPositions: {
        "maplibre-layer-control": "top-right",
        "maplibre-gl-basemap-control": "top-right",
        "maplibre-gl-geo-editor": "top-left",
      },
      settings: {},
    },
    preferences: {
      map: {
        restrictBounds: false,
        bounds: [-180, -85, 180, 85],
        minZoom: 0,
        maxZoom: 24,
        maxPitch: 85,
        renderWorldCopies: true,
      },
      environmentVariables: [],
    },
    metadata: {
      experiment: true,
      source: "Supabase platform_datasets",
      sourceProject: "hongtang-sustainable-development-platform",
      bridgeMode: "read-only",
      generatedAt: new Date().toISOString(),
      sourceUpdatedAt: updatedAt,
      note: "GeoLibre 内的试验性编辑不会自动覆盖正式平台数据。",
    },
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return jsonResponse({ error: "仅支持 GET 请求" }, 405);
  }

  try {
    const datasets = await fetchDatasets();
    const definitions = buildLayerDefinitions(datasets);
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "project";

    if (format === "geojson") {
      const layerId = url.searchParams.get("layer") ?? "";
      const layer = definitions.find((item) => item.id === layerId);
      if (!layer) {
        return jsonResponse({
          error: "未找到指定图层",
          availableLayers: definitions.map((item) => item.id),
        }, 404);
      }

      const collection: GeoJsonFeatureCollection = {
        type: "FeatureCollection",
        features: layer.features,
      };
      return jsonResponse(collection);
    }

    if (format !== "project") {
      return jsonResponse({ error: "format 仅支持 project 或 geojson" }, 400);
    }

    return jsonResponse(buildProject(datasets, definitions));
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return jsonResponse({ error: message }, 500);
  }
});
