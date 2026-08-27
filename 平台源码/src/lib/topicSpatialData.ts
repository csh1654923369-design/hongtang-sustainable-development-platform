import { MapFeatureType, type SpatialFeature } from "@/types";
import type { VillageTopicId } from "@/lib/villageTopics";
import type { HumanSettlementProfile } from "@/lib/humanSettlement";

export type TopicGeometryType = "point" | "line" | "polygon";
export type TopicCoordinate = [number, number];
export type TopicFieldEditor = "text" | "textarea" | "number" | "date" | "select";

export interface TopicFieldDefinition {
  key: string;
  label: string;
  editor: TopicFieldEditor;
  placeholder?: string;
  unit?: string;
  options?: string[];
}

export interface TopicSpatialLayer {
  id: string;
  topicId: VillageTopicId;
  title: string;
  shortDescription: string;
  geometryType: TopicGeometryType;
  color: string;
  pointFeatureType?: MapFeatureType;
  fields: TopicFieldDefinition[];
}

type TopicGeometry =
  | { type: "Point"; coordinates: TopicCoordinate }
  | { type: "LineString"; coordinates: TopicCoordinate[] }
  | { type: "Polygon"; coordinates: TopicCoordinate[] };

export interface TopicSpatialFeature {
  id: string;
  layerId: string;
  topicId: VillageTopicId;
  title: string;
  status: string;
  location: string;
  description: string;
  updatedAt: string;
  isDemo: true;
  geometry: TopicGeometry;
  properties: Record<string, string | number | null>;
  humanSettlement?: HumanSettlementProfile;
}

export interface TopicSpatialData {
  title: string;
  notice: string;
  updatedAt: string;
  layers: TopicSpatialLayer[];
  features: TopicSpatialFeature[];
}

export interface TopicSpatialSelection {
  item: TopicSpatialFeature;
  layer: TopicSpatialLayer;
}

export const topicColors: Record<VillageTopicId, string> = {
  garden: "#4f8d55",
  tea: "#a77832",
  water: "#39758a",
  safety: "#bd5a40",
  history: "#7a568e",
};

export function normalizeTopicSpatialData(data: TopicSpatialData): TopicSpatialData {
  const layers = data.layers.filter((layer) => layer.topicId !== "garden");
  const layerIds = new Set(layers.map((layer) => layer.id));
  return {
    ...data,
    layers,
    features: data.features.filter((feature) => feature.topicId !== "garden" && layerIds.has(feature.layerId)),
  };
}

export function topicGeometryLabel(type: TopicGeometryType) {
  if (type === "point") return "点要素";
  if (type === "line") return "线要素";
  return "面要素";
}

export function topicFeatureGeometryType(feature: TopicSpatialFeature): TopicGeometryType {
  if (feature.geometry.type === "Point") return "point";
  if (feature.geometry.type === "LineString") return "line";
  return "polygon";
}

export function topicFeatureCoordinates(feature: TopicSpatialFeature): TopicCoordinate[] {
  return feature.geometry.type === "Point"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
}

export function topicFeatureCenter(feature: TopicSpatialFeature): TopicCoordinate {
  const coordinates = topicFeatureCoordinates(feature);
  if (!coordinates.length) return [99.907084, 24.636574];
  const total = coordinates.reduce<TopicCoordinate>(
    (sum, coordinate) => [sum[0] + coordinate[0], sum[1] + coordinate[1]],
    [0, 0],
  );
  return [total[0] / coordinates.length, total[1] / coordinates.length];
}

export function findTopicLayer(data: TopicSpatialData | undefined, layerId: string) {
  return data?.layers.find((layer) => layer.id === layerId);
}

export function findTopicSpatialSelection(data: TopicSpatialData | undefined, id: string): TopicSpatialSelection | undefined {
  const item = data?.features.find((feature) => feature.id === id);
  if (!item) return undefined;
  const layer = findTopicLayer(data, item.layerId);
  return layer ? { item, layer } : undefined;
}

export function topicPointFeatures(data?: TopicSpatialData): SpatialFeature[] {
  if (!data) return [];
  const layers = new Map(data.layers.map((layer) => [layer.id, layer]));
  return data.features.flatMap((item) => {
    if (item.geometry.type !== "Point") return [];
    const layer = layers.get(item.layerId);
    if (!layer?.pointFeatureType) return [];
    const [longitude, latitude] = item.geometry.coordinates;
    return [{
      id: item.id,
      isDemo: true,
      title: item.title,
      featureType: layer.pointFeatureType,
      status: item.status,
      location: item.location,
      description: item.description,
      longitude,
      latitude,
      mapX: 0,
      mapY: 0,
      updatedAt: item.updatedAt,
      goalId: `topic-${item.topicId}`,
      publicParticipation: false,
      submittedByMe: false,
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      imageLabel: layer.title,
      topicLayerId: layer.id,
      topicProperties: item.properties,
      humanSettlement: item.humanSettlement,
    } satisfies SpatialFeature];
  });
}

export function filterTopicSpatialData(
  data: TopicSpatialData | undefined,
  visibleTopics: Iterable<VillageTopicId>,
): TopicSpatialData | undefined {
  if (!data) return undefined;
  const visible = new Set(visibleTopics);
  return {
    ...data,
    layers: data.layers.filter((layer) => visible.has(layer.topicId)),
    features: data.features.filter((feature) => visible.has(feature.topicId)),
  };
}
