import { MapFeatureType, SpatialFeature } from "@/types";

export type FieldworkModuleId = "garden" | "water" | "tea";
export type WaterNodeKind = "source" | "storage" | "supply" | "treatment";
export type WaterLineKind = "main-drain" | "outlet" | "branch-drain";

export interface FieldworkDisplayField {
  key: string;
  label: string;
  value: string;
  unit?: string;
}

export interface FieldworkTopicRecord {
  id: string;
  moduleId: FieldworkModuleId;
  recordTitle: string;
  surveyDate: string;
  observer: string;
  siteId: string;
  siteName: string;
  longitude?: number;
  latitude?: number;
  values: Record<string, string>;
  displayFields: FieldworkDisplayField[];
  notes: string;
  reviewStatus: "unverified";
  createdAt: string;
  updatedAt: string;
  isDemo: true;
}

export interface TopicRecordPayload {
  meta: { title: string; updatedAt: string; notice: string };
  records: FieldworkTopicRecord[];
}

export interface WaterSystemNode {
  id: string;
  kind: WaterNodeKind;
  title: string;
  longitude: number;
  latitude: number;
  elevation: number | null;
  location: string;
  description: string;
  status: string;
}

export interface WaterSystemLine {
  id: string;
  kind: WaterLineKind;
  title: string;
  path: [number, number][];
  dropMeters: number;
  location: string;
  description: string;
  status: string;
}

export interface WaterSystemZone {
  id: string;
  kind: "supply-zone";
  title: string;
  polygon: [number, number][];
  supplyNodeId: string;
  location: string;
  description: string;
  status: string;
}

export interface WaterSystemData {
  title: string;
  notice: string;
  updatedAt: string;
  terrainBasis: string;
  nodes: WaterSystemNode[];
  lines: WaterSystemLine[];
  zones: WaterSystemZone[];
}

export type WaterSpatialSelection =
  | { type: "node"; item: WaterSystemNode }
  | { type: "line"; item: WaterSystemLine }
  | { type: "zone"; item: WaterSystemZone };

export const waterNodeLabels: Record<WaterNodeKind, string> = {
  source: "水源",
  storage: "水塘调蓄",
  supply: "集中供水点",
  treatment: "污水处理",
};

export const waterLineStyles: Record<WaterLineKind, { color: string; width: number; dash?: string; label: string }> = {
  "main-drain": { color: "#2f7fa8", width: 3.4, label: "主排水沟" },
  outlet: { color: "#1d4e89", width: 4, label: "出流沟" },
  "branch-drain": { color: "#6ba6c4", width: 2.6, dash: "8 6", label: "支沟" },
};

export function waterNodesToSpatialFeatures(data?: WaterSystemData): SpatialFeature[] {
  if (!data) return [];
  return data.nodes.map((node) => ({
    id: node.id,
    isDemo: true,
    title: node.title,
    featureType: MapFeatureType.WaterFacility,
    status: node.status,
    location: node.location,
    description: node.description,
    longitude: node.longitude,
    latitude: node.latitude,
    mapX: 0,
    mapY: 0,
    updatedAt: data.updatedAt,
    goalId: "goal-water",
    publicParticipation: false,
    submittedByMe: false,
    geometry: { type: "Point", coordinates: [node.longitude, node.latitude] },
    imageLabel: waterNodeLabels[node.kind],
    sourceLabel: data.notice,
  }));
}

export function topicRecordsForFeature(records: FieldworkTopicRecord[], featureId?: string) {
  return featureId ? records.filter((record) => record.siteId === featureId) : [];
}

export function findWaterSelection(data: WaterSystemData | undefined, id: string): WaterSpatialSelection | undefined {
  if (!data) return undefined;
  const node = data.nodes.find((item) => item.id === id);
  if (node) return { type: "node", item: node };
  const line = data.lines.find((item) => item.id === id);
  if (line) return { type: "line", item: line };
  const zone = data.zones.find((item) => item.id === id);
  return zone ? { type: "zone", item: zone } : undefined;
}
