import { MapFeatureType } from "@/types";

export const mapFeatureLabels: Record<MapFeatureType, string> = {
  [MapFeatureType.Garden]: "小花园",
  [MapFeatureType.TeaGarden]: "茶场",
  [MapFeatureType.TeaFactory]: "茶厂",
  [MapFeatureType.WaterFacility]: "村里用水",
  [MapFeatureType.SafetyRisk]: "安全隐患",
  [MapFeatureType.VillageMemory]: "村庄记忆",
  [MapFeatureType.Issue]: "村庄问题",
  [MapFeatureType.Project]: "建设项目",
  [MapFeatureType.CommunityAction]: "社区行动",
  [MapFeatureType.ResourceOffer]: "可提供资源",
  [MapFeatureType.ResourceNeed]: "资源需求",
  [MapFeatureType.CompletedAction]: "已完成行动",
  [MapFeatureType.PublicService]: "公共服务设施",
  [MapFeatureType.Ecology]: "生态资源",
  [MapFeatureType.Culture]: "文化资源",
  [MapFeatureType.ResearchPhoto]: "村景记录",
  [MapFeatureType.Building]: "建筑",
  [MapFeatureType.Road]: "道路",
  [MapFeatureType.Water]: "水体",
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
