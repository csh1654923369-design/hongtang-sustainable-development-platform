"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { MapFeatureType, SpatialFeature } from "@/types";
import { VillageMap } from "@/components/map/VillageMap";
import { MapDetailDrawer } from "@/components/map/MapDetailDrawer";
import { useDemo } from "@/components/providers/DemoProvider";
import { communityRecordsToMapFeatures } from "@/lib/communityMapFeatures";

const filters = [
  { id: "all", label: "全部" },
  { id: "village-matters", label: "村里事项" },
  { id: MapFeatureType.Issue, label: "问题" },
  { id: MapFeatureType.CommunityAction, label: "微行动" },
  { id: "resources", label: "互助资源" },
  { id: MapFeatureType.Project, label: "项目" },
];

const villageMatterTypes = new Set([
  MapFeatureType.Garden,
  MapFeatureType.TeaGarden,
  MapFeatureType.TeaFactory,
  MapFeatureType.WaterFacility,
  MapFeatureType.SafetyRisk,
  MapFeatureType.VillageMemory,
]);

export function HomeMapPreview({ features }: { features: SpatialFeature[] }) {
  const { microActions, communityResources } = useDemo();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<SpatialFeature | undefined>(features[0]);
  const allFeatures = useMemo(() => [...communityRecordsToMapFeatures(microActions, communityResources), ...features], [microActions, communityResources, features]);
  const visible = useMemo(() => allFeatures.filter((feature) => {
    if (filter === "all") return true;
    if (filter === "village-matters") return villageMatterTypes.has(feature.featureType);
    if (filter === "resources") return feature.featureType === MapFeatureType.ResourceOffer || feature.featureType === MapFeatureType.ResourceNeed;
    return feature.featureType === filter;
  }).slice(0, 9), [allFeatures, filter]);
  return (
    <div className="home-map-block">
      <div className="map-preview-tabs" role="tablist">{filters.map((item) => <button role="tab" aria-selected={filter === item.id} className={filter === item.id ? "active" : ""} key={item.id} onClick={() => { setFilter(item.id); setSelected(undefined); }}>{item.label}</button>)}</div>
      <div className="home-map-grid"><VillageMap features={visible} selectedId={selected?.id} onSelect={setSelected} /><MapDetailDrawer feature={selected && visible.some((item) => item.id === selected.id) ? selected : undefined} onClose={() => setSelected(undefined)} /></div>
      <Link href="/map" className="button button-secondary map-full-link">打开完整的村里一张图 <ArrowRight size={17} /></Link>
    </div>
  );
}
