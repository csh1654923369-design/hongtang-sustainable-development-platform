import { MapFeatureType, SpatialFeature } from "@/types";
import type { HumanSettlementProfile } from "@/lib/humanSettlement";

export type FieldworkModuleId = "garden" | "water" | "tea" | "safety" | "history";
export type WaterNodeKind = "source" | "storage" | "supply" | "treatment";
export type WaterLineKind = "supply-main" | "supply-branch" | "main-drain" | "outlet" | "branch-drain";
export type WaterSystemBranch = "supply" | "drainage" | "both";
export type WaterTopicMode = "off" | "overview" | "supply" | "drainage";

export interface WaterTopicStorySection {
  title: string;
  question: string;
  summary: string;
  chain: string[];
}

export interface WaterTopicStory {
  title: string;
  question: string;
  overview: WaterTopicStorySection;
  supply: WaterTopicStorySection;
  drainage: WaterTopicStorySection;
  participationPrompt: string;
}

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
  system: WaterSystemBranch;
  title: string;
  longitude: number;
  latitude: number;
  elevation: number | null;
  location: string;
  description: string;
  status: string;
  upstreamIds?: string[];
  downstreamIds?: string[];
  servedZoneIds?: string[];
  functions?: string[];
  maintenance?: string;
  openQuestions?: string[];
  humanSettlement?: HumanSettlementProfile;
}

export interface WaterSystemLine {
  id: string;
  kind: WaterLineKind;
  system: WaterSystemBranch;
  title: string;
  path: [number, number][];
  dropMeters: number;
  location: string;
  description: string;
  status: string;
  fromNodeId?: string;
  toNodeId?: string;
  servedZoneIds?: string[];
  flowDescription?: string;
  maintenance?: string;
  openQuestions?: string[];
  humanSettlement?: HumanSettlementProfile;
}

export interface WaterSystemZone {
  id: string;
  kind: "supply-zone";
  system: "supply";
  title: string;
  polygon: [number, number][];
  supplyNodeId: string;
  location: string;
  description: string;
  status: string;
  sourceNodeIds?: string[];
  routeLineIds?: string[];
  servedUses?: string[];
  maintenance?: string;
  openQuestions?: string[];
  humanSettlement?: HumanSettlementProfile;
}

export interface WaterSystemData {
  title: string;
  notice: string;
  updatedAt: string;
  terrainBasis: string;
  story: WaterTopicStory;
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
  "supply-main": { color: "#176d91", width: 4, label: "供水主管" },
  "supply-branch": { color: "#45a7c4", width: 3, dash: "5 4", label: "供水支管" },
  "main-drain": { color: "#2f7fa8", width: 3.4, label: "主排水沟" },
  outlet: { color: "#1d4e89", width: 4, label: "出流沟" },
  "branch-drain": { color: "#6ba6c4", width: 2.6, dash: "8 6", label: "支沟" },
};

export function waterSelectionBranch(selection: WaterSpatialSelection): WaterSystemBranch {
  return selection.item.system;
}

export function waterMatchesTopicMode(system: WaterSystemBranch, mode: WaterTopicMode) {
  return mode === "off" || mode === "overview" || system === "both" || system === mode;
}

export function waterFeatureBranch(feature: SpatialFeature): WaterSystemBranch {
  if (feature.waterSystemBranch) return feature.waterSystemBranch;
  if (/污水|排水|沟|处理池|处理设备/.test(`${feature.title} ${feature.description}`)) return "drainage";
  if (/饮水|供水|水源|取水/.test(`${feature.title} ${feature.description}`)) return "supply";
  return "both";
}

export function filterWaterSystem(data: WaterSystemData | undefined, mode: WaterTopicMode): WaterSystemData | undefined {
  if (!data || mode === "off" || mode === "overview") return data;
  return {
    ...data,
    nodes: data.nodes.filter((node) => waterMatchesTopicMode(node.system, mode)),
    lines: data.lines.filter((line) => waterMatchesTopicMode(line.system, mode)),
    zones: data.zones.filter((zone) => waterMatchesTopicMode(zone.system, mode)),
  };
}

export function waterSelectionRelatedIds(selection: WaterSpatialSelection, data: WaterSystemData): string[] {
  const related = new Set<string>([selection.item.id]);
  if (selection.type === "node") {
    selection.item.upstreamIds?.forEach((id) => related.add(id));
    selection.item.downstreamIds?.forEach((id) => related.add(id));
    selection.item.servedZoneIds?.forEach((id) => related.add(id));
  } else if (selection.type === "line") {
    if (selection.item.fromNodeId) related.add(selection.item.fromNodeId);
    if (selection.item.toNodeId) related.add(selection.item.toNodeId);
    selection.item.servedZoneIds?.forEach((id) => related.add(id));
  } else {
    related.add(selection.item.supplyNodeId);
    selection.item.sourceNodeIds?.forEach((id) => related.add(id));
    selection.item.routeLineIds?.forEach((id) => related.add(id));
  }
  return [...related].filter((id) => Boolean(findWaterSelection(data, id)));
}

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
    waterSystemBranch: node.system,
    humanSettlement: node.humanSettlement,
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
