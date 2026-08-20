import { MapFeatureType } from "@/types";

export type VillageTopicId = "garden" | "tea" | "water" | "safety" | "history";

export interface VillageTopicDefinition {
  id: VillageTopicId;
  title: string;
  shortDescription: string;
  question: string;
  featureTypes: MapFeatureType[];
  focus: string[];
  emptyMessage: string;
}

export const villageTopics: VillageTopicDefinition[] = [
  {
    id: "garden",
    title: "小花园",
    shortDescription: "查看现有小花园位置",
    question: "红塘村现有小花园分别在哪里？",
    featureTypes: [MapFeatureType.Garden],
    focus: ["小花园位置"],
    emptyMessage: "尚未录入已核实的小花园资料。",
  },
  {
    id: "tea",
    title: "茶产业",
    shortDescription: "连接茶园、农户与茶厂",
    question: "茶叶从哪片茶园出发，由谁采收，最终进入哪座茶厂？",
    featureTypes: [MapFeatureType.TeaGarden, MapFeatureType.TeaFactory],
    focus: ["茶园与土壤", "采青和收购", "农户—茶厂关系"],
    emptyMessage: "尚未录入已核实的茶园或茶厂资料。",
  },
  {
    id: "water",
    title: "村里用水",
    shortDescription: "沿水源、线路与片区理解水系统",
    question: "水从哪里来，经过哪里，被谁使用，最后流向哪里？",
    featureTypes: [MapFeatureType.WaterFacility],
    focus: ["水系统全貌", "饮水从哪来", "排水到哪里"],
    emptyMessage: "尚未录入已核实的供排水资料。",
  },
  {
    id: "safety",
    title: "塌方与安全",
    shortDescription: "持续记录隐患、影响与处置",
    question: "塌方和其他隐患在哪里，影响哪些人和道路，之后怎样处置？",
    featureTypes: [MapFeatureType.SafetyRisk],
    focus: ["隐患位置", "影响对象", "处置与复查"],
    emptyMessage: "目前没有已核实的塌方或安全隐患点，等待实地调查补充。",
  },
  {
    id: "history",
    title: "历史与文化",
    shortDescription: "连接古道、地点与村民记忆",
    question: "茶马古道经过哪里，沿线留下了哪些遗存、故事和生活记忆？",
    featureTypes: [MapFeatureType.VillageMemory, MapFeatureType.Culture],
    focus: ["古道线路", "历史地点", "口述与影像"],
    emptyMessage: "目前没有已核实的古道线路或历史地点，等待口述与现场调查补充。",
  },
];

export const supportingLayerTypes = [
  MapFeatureType.PublicService,
  MapFeatureType.Ecology,
  MapFeatureType.ResearchPhoto,
] as const;

export const villageTopicById = Object.fromEntries(
  villageTopics.map((topic) => [topic.id, topic]),
) as Record<VillageTopicId, VillageTopicDefinition>;

export function countTopicFeatures(
  topic: VillageTopicDefinition,
  counts: Partial<Record<MapFeatureType, number>>,
) {
  return topic.featureTypes.reduce((total, type) => total + (counts[type] ?? 0), 0);
}
