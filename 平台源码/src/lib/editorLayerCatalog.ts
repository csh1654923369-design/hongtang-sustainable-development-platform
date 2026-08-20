import { MapFeatureType, type SpatialFeature } from "@/types";
import type { WaterSystemData } from "@/lib/spatialData";
import {
  type TopicGeometryType,
  type TopicSpatialData,
  type TopicSpatialFeature,
  type TopicSpatialLayer,
} from "@/lib/topicSpatialData";
import { villageTopics, type VillageTopicId } from "@/lib/villageTopics";

export type EditorDataKind = "base-point" | "water-node" | "water-line" | "water-zone" | "topic-spatial";

export interface EditorLayerItem {
  kind: EditorDataKind;
  id: string;
  title: string;
  subtitle: string;
}

export interface EditorLayerGroup {
  id: string;
  topicId: VillageTopicId;
  title: string;
  shortDescription: string;
  geometryType: TopicGeometryType;
  color: string;
  dataKind: EditorDataKind;
  featureType?: MapFeatureType;
  topicLayer?: TopicSpatialLayer;
  items: EditorLayerItem[];
}

export interface EditorTopicGroup {
  id: VillageTopicId;
  title: string;
  question: string;
  layers: EditorLayerGroup[];
}

const topicColor: Record<VillageTopicId, string> = {
  garden: "#4f8d55",
  tea: "#a77832",
  water: "#39758a",
  safety: "#bd5a40",
  history: "#7a568e",
};

function pointItems(features: SpatialFeature[], types: MapFeatureType[]): EditorLayerItem[] {
  return features
    .filter((feature) => types.includes(feature.featureType))
    .map((feature) => ({
      kind: "base-point" as const,
      id: feature.id,
      title: feature.title,
      subtitle: feature.location,
    }));
}

function topicItems(features: TopicSpatialFeature[], layer: TopicSpatialLayer): EditorLayerItem[] {
  return features
    .filter((feature) => feature.layerId === layer.id)
    .map((feature) => ({
      kind: "topic-spatial" as const,
      id: feature.id,
      title: feature.title,
      subtitle: feature.location,
    }));
}

export function buildEditorTopicGroups(
  features: SpatialFeature[],
  waterSystem: WaterSystemData,
  topicSpatial: TopicSpatialData,
): EditorTopicGroup[] {
  const layers: EditorLayerGroup[] = [
    { id: "garden-sites", topicId: "garden", title: "小花园位置", shortDescription: "已有花园点位与照片", geometryType: "point", color: topicColor.garden, dataKind: "base-point", featureType: MapFeatureType.Garden, items: pointItems(features, [MapFeatureType.Garden]) },
    { id: "tea-factories", topicId: "tea", title: "茶厂", shortDescription: "茶叶收购与加工地点", geometryType: "point", color: topicColor.tea, dataKind: "base-point", featureType: MapFeatureType.TeaFactory, items: pointItems(features, [MapFeatureType.TeaFactory]) },
    { id: "water-facilities", topicId: "water", title: "已有供排水设施", shortDescription: "已有污水处理等点位", geometryType: "point", color: topicColor.water, dataKind: "base-point", featureType: MapFeatureType.WaterFacility, items: pointItems(features, [MapFeatureType.WaterFacility]) },
    { id: "water-nodes", topicId: "water", title: "水源与设施节点", shortDescription: "水源、调蓄、供水与处理", geometryType: "point", color: topicColor.water, dataKind: "water-node", featureType: MapFeatureType.WaterFacility, items: waterSystem.nodes.map((item) => ({ kind: "water-node", id: item.id, title: item.title, subtitle: item.location })) },
    { id: "water-lines", topicId: "water", title: "供排水线路", shortDescription: "供水主管、支管与排水沟", geometryType: "line", color: topicColor.water, dataKind: "water-line", items: waterSystem.lines.map((item) => ({ kind: "water-line", id: item.id, title: item.title, subtitle: item.location })) },
    { id: "water-zones", topicId: "water", title: "供水分区", shortDescription: "水源—线路—服务片区", geometryType: "polygon", color: topicColor.water, dataKind: "water-zone", items: waterSystem.zones.map((item) => ({ kind: "water-zone", id: item.id, title: item.title, subtitle: item.location })) },
  ];

  topicSpatial.layers.forEach((layer) => {
    layers.push({
      id: layer.id,
      topicId: layer.topicId,
      title: layer.title,
      shortDescription: layer.shortDescription,
      geometryType: layer.geometryType,
      color: layer.color,
      dataKind: "topic-spatial",
      featureType: layer.pointFeatureType,
      topicLayer: layer,
      items: topicItems(topicSpatial.features, layer),
    });
  });

  return villageTopics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    question: topic.question,
    layers: layers.filter((layer) => layer.topicId === topic.id),
  }));
}
