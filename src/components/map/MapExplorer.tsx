"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Layers3, ListFilter } from "lucide-react";
import { MapFeatureType, SpatialFeature } from "@/types";
import { MapFilterPanel, initialMapFilters, MapFilters, verifiedMapFeatureTypes } from "@/components/map/MapFilterPanel";
import { VillageBasemap, VillageMap } from "@/components/map/VillageMap";
import { MapDetailDrawer } from "@/components/map/MapDetailDrawer";
import { WaterSpatialDetail } from "@/components/map/WaterSpatialDetail";
import { EmptyState } from "@/components/common/EmptyState";
import {
  FieldworkTopicRecord,
  TopicRecordPayload,
  WaterSpatialSelection,
  WaterSystemData,
  topicRecordsForFeature,
  waterNodesToSpatialFeatures,
} from "@/lib/spatialData";

export function MapExplorer() {
  const [filters, setFilters] = useState<MapFilters>(initialMapFilters);
  const [selected, setSelected] = useState<SpatialFeature>();
  const [waterSelection, setWaterSelection] = useState<WaterSpatialSelection>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [basemap, setBasemap] = useState<VillageBasemap>("handdrawn");
  const [realFeatures, setRealFeatures] = useState<SpatialFeature[]>([]);
  const [waterSystem, setWaterSystem] = useState<WaterSystemData>();
  const [topicRecords, setTopicRecords] = useState<FieldworkTopicRecord[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/data/hongtang-real-map-features.json", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error(`Unable to load map data: ${response.status}`);
        return response.json() as Promise<{ features: SpatialFeature[] }>;
      }),
      fetch("/data/hongtang-water-system.json", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error(`Unable to load water data: ${response.status}`);
        return response.json() as Promise<WaterSystemData>;
      }),
      fetch("/data/hongtang-topic-records.json", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error(`Unable to load topic records: ${response.status}`);
        return response.json() as Promise<TopicRecordPayload>;
      }),
    ])
      .then(([mapPayload, waterPayload, recordPayload]) => {
        if (!active) return;
        const verified = mapPayload.features.filter((feature) =>
          verifiedMapFeatureTypes.includes(feature.featureType as (typeof verifiedMapFeatureTypes)[number]),
        );
        setRealFeatures(verified);
        setWaterSystem(waterPayload);
        setTopicRecords(recordPayload.records ?? []);
        setSelected(verified[0]);
      })
      .catch(() => {
        if (!active) return;
        setRealFeatures([]);
        setWaterSystem(undefined);
        setTopicRecords([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const allFeatures = useMemo(
    () => [...realFeatures, ...waterNodesToSpatialFeatures(waterSystem)],
    [realFeatures, waterSystem],
  );
  const availableTypes = useMemo(
    () => verifiedMapFeatureTypes.filter((type) =>
      allFeatures.some((feature) => feature.featureType === type),
    ) as MapFeatureType[],
    [allFeatures],
  );
  const counts = useMemo(() => {
    const result = allFeatures.reduce<Partial<Record<MapFeatureType, number>>>((next, feature) => {
      next[feature.featureType] = (next[feature.featureType] ?? 0) + 1;
      return next;
    }, {});
    result[MapFeatureType.WaterFacility] = (result[MapFeatureType.WaterFacility] ?? 0)
      + (waterSystem?.lines.length ?? 0)
      + (waterSystem?.zones.length ?? 0);
    return result;
  }, [allFeatures, waterSystem]);
  const visible = useMemo(
    () => allFeatures.filter((feature) => filters.types.includes(feature.featureType)),
    [allFeatures, filters],
  );
  const showWaterSystem = filters.types.includes(MapFeatureType.WaterFacility);
  const visibleObjectCount = visible.length + (showWaterSystem
    ? (waterSystem?.lines.length ?? 0) + (waterSystem?.zones.length ?? 0)
    : 0);
  const resetFilters = () => setFilters({ types: [...availableTypes] });
  const changeFilters = (next: MapFilters) => {
    setFilters(next);
    if (!next.types.includes(MapFeatureType.WaterFacility)) setWaterSelection(undefined);
  };
  const selectFeature = (feature: SpatialFeature) => {
    setSelected(feature);
    setWaterSelection(undefined);
  };
  const selectSpatial = (selection: WaterSpatialSelection) => {
    setWaterSelection(selection);
    setSelected(undefined);
  };

  return (
    <div className="map-explorer" data-shared-spatial-data="points-lines-polygons">
      <div className={`map-filter-mobile ${filtersOpen ? "open" : ""}`}>
        <MapFilterPanel filters={filters} availableTypes={availableTypes} counts={counts} onChange={changeFilters} onReset={resetFilters} />
      </div>
      <MapFilterPanel filters={filters} availableTypes={availableTypes} counts={counts} onChange={changeFilters} onReset={resetFilters} />
      <div className="map-canvas-wrap">
        <div className="map-mobile-toolbar">
          <button className="button button-secondary" onClick={() => setFiltersOpen((value) => !value)}><ListFilter size={17} />筛选要素</button>
          <span>{visibleObjectCount} 个要素</span>
        </div>
        <div className="map-basemap-control" aria-label="切换地图底图">
          <button className={basemap === "aerial" ? "active" : ""} onClick={() => setBasemap("aerial")} aria-pressed={basemap === "aerial"}><ImageIcon size={16} />无人机影像</button>
          <button className={basemap === "handdrawn" ? "active" : ""} onClick={() => setBasemap("handdrawn")} aria-pressed={basemap === "handdrawn"}><Layers3 size={16} />手绘图</button>
        </div>
        {visibleObjectCount
          ? (
            <VillageMap
              features={visible}
              selectedId={selected?.id}
              onSelect={selectFeature}
              basemap={basemap}
              waterSystem={showWaterSystem ? waterSystem : undefined}
              selectedSpatialId={waterSelection?.item.id}
              onSelectSpatial={selectSpatial}
            />
          )
          : <EmptyState title="没有符合条件的地图要素" description="请调整筛选条件或重新全选专题类型。" />}
      </div>
      {waterSelection && waterSystem ? (
        <WaterSpatialDetail selection={waterSelection} data={waterSystem} onClose={() => setWaterSelection(undefined)} />
      ) : (
        <MapDetailDrawer
          feature={selected && visible.some((item) => item.id === selected.id) ? selected : undefined}
          records={topicRecordsForFeature(topicRecords, selected?.id)}
          onClose={() => setSelected(undefined)}
        />
      )}
    </div>
  );
}
