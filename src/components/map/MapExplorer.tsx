"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListFilter, MapPinPlus } from "lucide-react";
import { SpatialFeature } from "@/types";
import { MapFilterPanel, initialMapFilters, MapFilters } from "@/components/map/MapFilterPanel";
import { VillageMap } from "@/components/map/VillageMap";
import { MapDetailDrawer } from "@/components/map/MapDetailDrawer";
import { EmptyState } from "@/components/common/EmptyState";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";

export function MapExplorer({ features }: { features: SpatialFeature[] }) {
  const router = useRouter();
  const { role, notify } = useDemo();
  const [filters, setFilters] = useState<MapFilters>(initialMapFilters);
  const [selected, setSelected] = useState<SpatialFeature | undefined>(features[0]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const visible = useMemo(() => features.filter((feature) => filters.types.includes(feature.featureType) && (filters.status === "all" || feature.status === filters.status) && (filters.goalId === "all" || feature.goalId === filters.goalId) && (!filters.participationOnly || feature.publicParticipation) && (!filters.mineOnly || feature.submittedByMe)), [features, filters]);
  const report = () => {
    if (!can(role, "reportIssue")) { notify("请切换为村民角色", "游客可以浏览地图，但不能提交正式问题。" ); return; }
    router.push("/report");
  };
  return (
    <div className="map-explorer">
      <div className={`map-filter-mobile ${filtersOpen ? "open" : ""}`}><MapFilterPanel filters={filters} onChange={setFilters} onReset={() => setFilters(initialMapFilters)} /></div>
      <MapFilterPanel filters={filters} onChange={setFilters} onReset={() => setFilters(initialMapFilters)} />
      <div className="map-canvas-wrap">
        <div className="map-mobile-toolbar"><button className="button button-secondary" onClick={() => setFiltersOpen((value) => !value)}><ListFilter size={17} />筛选图层</button><span>{visible.length} 个点位</span></div>
        {visible.length ? <VillageMap features={visible} selectedId={selected?.id} onSelect={setSelected} /> : <EmptyState title="没有符合条件的点位" description="请调整筛选条件或重置图层。" />}
        <button className="map-report-fab" onClick={report}><MapPinPlus size={20} />上报问题</button>
      </div>
      <MapDetailDrawer feature={selected && visible.some((item) => item.id === selected.id) ? selected : undefined} onClose={() => setSelected(undefined)} />
    </div>
  );
}
