"use client";

import { Building2, CircleParking, Droplets, Factory, Flower2, HandHeart, History, House, Landmark, Leaf, MapPin, PackageSearch, School, ShieldCheck, Sparkles, Sprout, SunMedium, Toilet, Trash2, Trees, TriangleAlert, Users, Wrench } from "lucide-react";
import { SpatialFeature, MapFeatureType } from "@/types";
import { cn } from "@/lib/utils";

const icons = {
  [MapFeatureType.Garden]: Flower2,
  [MapFeatureType.TeaGarden]: Sprout,
  [MapFeatureType.TeaFactory]: Factory,
  [MapFeatureType.WaterFacility]: Droplets,
  [MapFeatureType.SolarFacility]: SunMedium,
  [MapFeatureType.SafetyRisk]: TriangleAlert,
  [MapFeatureType.VillageMemory]: History,
  [MapFeatureType.Issue]: MapPin,
  [MapFeatureType.Project]: Wrench,
  [MapFeatureType.CommunityAction]: Sparkles,
  [MapFeatureType.ResourceOffer]: HandHeart,
  [MapFeatureType.ResourceNeed]: PackageSearch,
  [MapFeatureType.CompletedAction]: ShieldCheck,
  [MapFeatureType.PublicService]: Building2,
  [MapFeatureType.Ecology]: Leaf,
  [MapFeatureType.Culture]: Landmark,
  [MapFeatureType.ResearchPhoto]: Trees,
  [MapFeatureType.Building]: Landmark,
  [MapFeatureType.Road]: MapPin,
  [MapFeatureType.Water]: Leaf,
};

const publicServiceIcons = {
  building: Building2,
  factory: Factory,
  house: House,
  landmark: Landmark,
  parking: CircleParking,
  school: School,
  toilet: Toilet,
  trash: Trash2,
  users: Users,
};

type PublicServiceIconKey = keyof typeof publicServiceIcons;

function getPublicServiceIconKey(title: string): PublicServiceIconKey {
  if (/厕所|公厕|卫生间/.test(title)) return "toilet";
  if (/停车/.test(title)) return "parking";
  if (/小学|学校/.test(title)) return "school";
  if (/垃圾/.test(title)) return "trash";
  if (/活动中心|老年/.test(title)) return "users";
  if (/加工厂|厂/.test(title)) return "factory";
  if (/村委/.test(title)) return "landmark";
  if (/居|住宅|民宿/.test(title)) return "house";
  return "building";
}
export function MapMarker({ feature, active, onClick, position }: { feature: SpatialFeature; active: boolean; onClick: () => void; position?: { x: number; y: number } }) {
  const Icon = feature.featureType === MapFeatureType.PublicService
    ? publicServiceIcons[getPublicServiceIconKey(feature.title)]
    : icons[feature.featureType];
  const markerPosition = position ?? { x: feature.mapX, y: feature.mapY };
  return (
    <button
      className={cn("map-marker", `marker-${feature.featureType}`, active && "active")}
      style={{ left: `${markerPosition.x}%`, top: `${markerPosition.y}%` }}
      onClick={onClick}
      aria-label={`${feature.title}，${feature.status}`}
      title={feature.title}
      data-feature-id={feature.id}
      data-feature-type={feature.featureType}
    >
      <Icon size={16} /><span>{feature.title}</span>
    </button>
  );
}
