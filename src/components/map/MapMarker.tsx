"use client";

import { Landmark, Leaf, MapPin, ShieldCheck, Stethoscope, Trees, Wrench } from "lucide-react";
import { SpatialFeature, MapFeatureType } from "@/types";
import { cn } from "@/lib/utils";

const icons = {
  [MapFeatureType.Issue]: MapPin,
  [MapFeatureType.Project]: Wrench,
  [MapFeatureType.CompletedAction]: ShieldCheck,
  [MapFeatureType.PublicService]: Stethoscope,
  [MapFeatureType.Ecology]: Leaf,
  [MapFeatureType.Culture]: Landmark,
  [MapFeatureType.ResearchPhoto]: Trees,
  [MapFeatureType.Building]: Landmark,
  [MapFeatureType.Road]: MapPin,
  [MapFeatureType.Water]: Leaf,
};

export function MapMarker({ feature, active, onClick }: { feature: SpatialFeature; active: boolean; onClick: () => void }) {
  const Icon = icons[feature.featureType];
  return (
    <button
      className={cn("map-marker", `marker-${feature.featureType}`, active && "active")}
      style={{ left: `${feature.mapX}%`, top: `${feature.mapY}%` }}
      onClick={onClick}
      aria-label={`${feature.title}，${feature.status}`}
      title={feature.title}
    >
      <Icon size={16} /><span>{feature.title}</span>
    </button>
  );
}
