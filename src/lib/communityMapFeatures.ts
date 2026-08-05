import { CommunityResource, MapFeatureType, MicroAction, SpatialFeature } from "@/types";
import { communityResourceCategoryLabels, microActionStatusLabels } from "@/lib/utils";

export function communityRecordsToMapFeatures(microActions: MicroAction[], communityResources: CommunityResource[]): SpatialFeature[] {
  return [
    ...microActions.map((action): SpatialFeature => ({
      id: `map-${action.id}`,
      isDemo: true,
      title: action.title,
      featureType: MapFeatureType.CommunityAction,
      status: microActionStatusLabels[action.status],
      location: action.location,
      description: `${action.summary} 下一步：${action.nextStep}`,
      longitude: action.longitude,
      latitude: action.latitude,
      mapX: action.mapX,
      mapY: action.mapY,
      updatedAt: action.updates.at(-1)?.date ?? action.createdAt,
      goalId: action.goalId,
      publicParticipation: true,
      submittedByMe: action.submittedByMe,
      geometry: { type: "Point", coordinates: [action.longitude, action.latitude] },
      linkedId: action.id,
      imageLabel: `社区微行动 · ${action.durationDays} 天试验`,
    })),
    ...communityResources.map((resource): SpatialFeature => ({
      id: `map-${resource.id}`,
      isDemo: true,
      title: resource.title,
      featureType: resource.mode === "offer" ? MapFeatureType.ResourceOffer : MapFeatureType.ResourceNeed,
      status: resource.status === "matched" ? "已匹配" : resource.mode === "offer" ? "可提供" : "需求中",
      location: resource.location,
      description: `${communityResourceCategoryLabels[resource.category]} · ${resource.description} 可用时间：${resource.availability}`,
      longitude: resource.longitude,
      latitude: resource.latitude,
      mapX: resource.mapX,
      mapY: resource.mapY,
      updatedAt: resource.updatedAt,
      goalId: resource.goalId,
      publicParticipation: resource.status === "open",
      submittedByMe: resource.submittedByMe,
      geometry: { type: "Point", coordinates: [resource.longitude, resource.latitude] },
      linkedId: resource.id,
      imageLabel: `${resource.mode === "offer" ? "可提供" : "正在寻找"} · ${communityResourceCategoryLabels[resource.category]}`,
    })),
  ];
}
