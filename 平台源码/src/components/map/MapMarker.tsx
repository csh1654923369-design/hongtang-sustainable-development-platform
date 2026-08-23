"use client";

import type { CSSProperties, MouseEvent } from "react";
import { Building2, CircleParking, Droplets, Factory, Flower2, HandHeart, History, House, Landmark, Leaf, MapPin, PackageSearch, School, ShieldCheck, Sparkles, Toilet, Trash2, TriangleAlert, Users, Wrench } from "lucide-react";
import { SpatialFeature, MapFeatureType } from "@/types";
import { cn } from "@/lib/utils";

const icons = {
  [MapFeatureType.Garden]: Flower2,
  [MapFeatureType.TeaGarden]: Factory,
  [MapFeatureType.TeaFactory]: Factory,
  [MapFeatureType.WaterFacility]: Droplets,
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
  [MapFeatureType.ResearchPhoto]: MapPin,
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

export type MapMarkerPosition = {
  x: number;
  y: number;
  unit?: "percent" | "pixel";
};

const supportingPointTypes = new Set<MapFeatureType>([
  MapFeatureType.PublicService,
  MapFeatureType.Ecology,
  MapFeatureType.ResearchPhoto,
]);

export function isSupportingMarkerType(type: MapFeatureType) {
  return supportingPointTypes.has(type);
}

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
export function MapMarker({ feature, active, related = false, muted = false, onClick, position, mapScale = 1, tabIndex }: { feature: SpatialFeature; active: boolean; related?: boolean; muted?: boolean; onClick: (event: MouseEvent<HTMLButtonElement>) => void; position?: MapMarkerPosition; mapScale?: number; tabIndex?: number }) {
  const Icon = feature.featureType === MapFeatureType.PublicService
    ? publicServiceIcons[getPublicServiceIconKey(feature.title)]
    : icons[feature.featureType];
  const markerPosition = position ?? { x: feature.mapX, y: feature.mapY };
  const positionUnit = markerPosition.unit === "pixel" ? "px" : "%";
  const isSupportingPoint = supportingPointTypes.has(feature.featureType);
  const markerLabel = feature.featureType === MapFeatureType.ResearchPhoto ? "村景记录" : feature.title;
  return (
    <button
      className={cn("map-marker", isSupportingPoint && "map-marker-dot", `marker-${feature.featureType}`, active && "active", related && "related", muted && "relation-muted")}
      style={{
        left: `${markerPosition.x}${positionUnit}`,
        top: `${markerPosition.y}${positionUnit}`,
        "--map-scale": mapScale,
      } as CSSProperties & Record<"--map-scale", number>}
      onClick={onClick}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      aria-label={`${markerLabel}，${feature.status}`}
      title={markerLabel}
      data-feature-id={feature.id}
      data-feature-type={feature.featureType}
      data-marker-shape={isSupportingPoint ? "dot" : "pin"}
      tabIndex={tabIndex}
    >
      {isSupportingPoint ? (
        <span className="map-marker-dot-core" aria-hidden="true" />
      ) : (
        <>
          <svg className="map-marker-pin" viewBox="0 0 84 104" aria-hidden="true" focusable="false" shapeRendering="geometricPrecision">
            <path className="map-marker-pin-shape" d="M42 101C35 88 7 65 7 42A35 35 0 1 1 77 42C77 65 49 88 42 101Z" />
            <circle className="map-marker-pin-core" cx="42" cy="42" r="24" />
          </svg>
          <Icon className="map-marker-symbol" size={17} aria-hidden="true" />
        </>
      )}
      <span className="map-marker-label">{markerLabel}</span>
    </button>
  );
}
