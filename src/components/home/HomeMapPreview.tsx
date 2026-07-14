"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { MapFeatureType, SpatialFeature } from "@/types";
import { VillageMap } from "@/components/map/VillageMap";
import { MapDetailDrawer } from "@/components/map/MapDetailDrawer";

const filters = [
  { id: "all", label: "全部" },
  { id: MapFeatureType.Issue, label: "问题" },
  { id: MapFeatureType.Project, label: "项目" },
  { id: MapFeatureType.PublicService, label: "公共服务" },
  { id: MapFeatureType.Ecology, label: "生态资源" },
  { id: MapFeatureType.Culture, label: "文化资源" },
];

export function HomeMapPreview({ features }: { features: SpatialFeature[] }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<SpatialFeature | undefined>(features[0]);
  const visible = useMemo(() => features.filter((feature) => filter === "all" || feature.featureType === filter).slice(0, 9), [features, filter]);
  return (
    <div className="home-map-block">
      <div className="map-preview-tabs" role="tablist">{filters.map((item) => <button role="tab" aria-selected={filter === item.id} className={filter === item.id ? "active" : ""} key={item.id} onClick={() => { setFilter(item.id); setSelected(undefined); }}>{item.label}</button>)}</div>
      <div className="home-map-grid"><VillageMap features={visible} selectedId={selected?.id} onSelect={setSelected} /><MapDetailDrawer feature={selected} onClose={() => setSelected(undefined)} /></div>
      <Link href="/map" className="button button-secondary map-full-link">打开完整行动地图 <ArrowRight size={17} /></Link>
    </div>
  );
}
