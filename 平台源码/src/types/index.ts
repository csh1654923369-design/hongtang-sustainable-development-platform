export enum MapFeatureType {
  Garden = "garden",
  TeaGarden = "tea-garden",
  TeaFactory = "tea-factory",
  WaterFacility = "water-facility",
  SafetyRisk = "safety-risk",
  VillageMemory = "village-memory",
  Issue = "issue",
  Project = "project",
  CommunityAction = "community-action",
  ResourceOffer = "resource-offer",
  ResourceNeed = "resource-need",
  CompletedAction = "completed-action",
  PublicService = "public-service",
  Ecology = "ecology",
  Culture = "culture",
  ResearchPhoto = "research-photo",
  Building = "building",
  Road = "road",
  Water = "water",
}

export interface GeometryPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface SpatialFeature {
  id: string;
  isDemo: boolean;
  title: string;
  featureType: MapFeatureType;
  status: string;
  location: string;
  description: string;
  longitude: number;
  latitude: number;
  mapX: number;
  mapY: number;
  updatedAt: string;
  goalId: string;
  publicParticipation: boolean;
  submittedByMe: boolean;
  geometry: GeometryPoint;
  geojson?: Record<string, unknown>;
  linkedId?: string;
  imageLabel: string;
  imageUrls?: string[];
  sourceLabel?: string;
  waterSystemBranch?: "supply" | "drainage" | "both";
  topicLayerId?: string;
  topicProperties?: Record<string, string | number | null>;
  humanSettlement?: import("@/lib/humanSettlement").HumanSettlementProfile;
}
