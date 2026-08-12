"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Image as ImageIcon, Layers3, ListFilter, Map as MapIcon, Satellite } from "lucide-react";
import { MapFeatureType, SpatialFeature } from "@/types";
import { createInitialMapFilters, MapFilterPanel, MapFilters, verifiedMapFeatureTypes } from "@/components/map/MapFilterPanel";
import { AmapVillageMap, type VillageOverlayMode } from "@/components/map/AmapVillageMap";
import { MapDetailDrawer } from "@/components/map/MapDetailDrawer";
import { WaterSpatialDetail } from "@/components/map/WaterSpatialDetail";
import { WaterTopicNavigator } from "@/components/map/WaterTopicNavigator";
import {
  FieldworkTopicRecord,
  TopicRecordPayload,
  WaterSpatialSelection,
  WaterSystemData,
  WaterTopicMode,
  filterWaterSystem,
  findWaterSelection,
  topicRecordsForFeature,
  waterFeatureBranch,
  waterMatchesTopicMode,
  waterNodesToSpatialFeatures,
  waterSelectionRelatedIds,
} from "@/lib/spatialData";
import { computeMapBubbleLayout, type MapScreenAnchor } from "@/lib/mapBubble";
import { fetchPlatformDataset } from "@/lib/platformData";
import { villageTopicById, type VillageTopicId } from "@/lib/villageTopics";

export function MapExplorer({
  filters: controlledFilters,
  onFiltersChange,
  showFilterControls = true,
  showBasemapControls = true,
  overlayMode: controlledOverlayMode,
  onOverlayModeChange,
  activeTopic,
  topicFeatureCount = 0,
  onTopicClose = () => undefined,
  waterTopicMode = "off",
  onWaterTopicModeChange = () => undefined,
}: {
  filters?: MapFilters;
  onFiltersChange?: (filters: MapFilters) => void;
  showFilterControls?: boolean;
  showBasemapControls?: boolean;
  overlayMode?: VillageOverlayMode;
  onOverlayModeChange?: (mode: VillageOverlayMode) => void;
  activeTopic?: VillageTopicId;
  topicFeatureCount?: number;
  onTopicClose?: () => void;
  waterTopicMode?: WaterTopicMode;
  onWaterTopicModeChange?: (mode: WaterTopicMode) => void;
}) {
  const [localFilters, setLocalFilters] = useState<MapFilters>(createInitialMapFilters);
  const filters = controlledFilters ?? localFilters;
  const updateFilters = onFiltersChange ?? setLocalFilters;
  const [selected, setSelected] = useState<SpatialFeature>();
  const [waterSelection, setWaterSelection] = useState<WaterSpatialSelection>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localOverlayMode, setLocalOverlayMode] = useState<VillageOverlayMode>("aerial");
  const overlayMode = controlledOverlayMode ?? localOverlayMode;
  const setOverlayMode = onOverlayModeChange ?? setLocalOverlayMode;
  const [realFeatures, setRealFeatures] = useState<SpatialFeature[]>([]);
  const [waterSystem, setWaterSystem] = useState<WaterSystemData>();
  const [topicRecords, setTopicRecords] = useState<FieldworkTopicRecord[]>([]);
  const [datasetsReady, setDatasetsReady] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<MapScreenAnchor>();

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchPlatformDataset<{ features: SpatialFeature[] }>(
        "hongtang-real-map-features",
        "/data/hongtang-real-map-features.json",
      ),
      fetchPlatformDataset<WaterSystemData>(
        "hongtang-water-system",
        "/data/hongtang-water-system.json",
      ),
      fetchPlatformDataset<TopicRecordPayload>(
        "hongtang-topic-records",
        "/data/hongtang-topic-records.json",
      ),
    ])
      .then(([mapPayload, waterPayload, recordPayload]) => {
        if (!active) return;
        const verified = mapPayload.features.filter((feature) =>
          verifiedMapFeatureTypes.includes(feature.featureType as (typeof verifiedMapFeatureTypes)[number]),
        );
        setRealFeatures(verified);
        setWaterSystem(waterPayload);
        setTopicRecords(recordPayload.records ?? []);
        setDatasetsReady(true);
      })
      .catch(() => {
        if (!active) return;
        setRealFeatures([]);
        setWaterSystem(undefined);
        setTopicRecords([]);
        setDatasetsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const allFeatures = useMemo(
    () => [...realFeatures, ...waterNodesToSpatialFeatures(waterSystem)],
    [realFeatures, waterSystem],
  );
  const topicWaterSystem = useMemo(
    () => filterWaterSystem(waterSystem, waterTopicMode),
    [waterSystem, waterTopicMode],
  );
  const waterTopicActive = activeTopic === "water" && waterTopicMode !== "off";
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
    () => waterTopicActive
      ? allFeatures.filter((feature) =>
          feature.featureType === MapFeatureType.WaterFacility
          && waterMatchesTopicMode(waterFeatureBranch(feature), waterTopicMode),
        )
      : allFeatures.filter((feature) => filters.types.includes(feature.featureType)),
    [allFeatures, filters, waterTopicActive, waterTopicMode],
  );
  const showWaterSystem = waterTopicActive || filters.types.includes(MapFeatureType.WaterFacility);
  const visibleWaterSystem = waterTopicActive ? topicWaterSystem : waterSystem;
  const visibleObjectCount = visible.length + (showWaterSystem
    ? (visibleWaterSystem?.lines.length ?? 0) + (visibleWaterSystem?.zones.length ?? 0)
    : 0);
  const resetFilters = () => updateFilters({ types: [...availableTypes] });
  const changeFilters = (next: MapFilters) => {
    updateFilters(next);
    if (!next.types.includes(MapFeatureType.WaterFacility)) setWaterSelection(undefined);
    if (selected && !next.types.includes(selected.featureType)) setSelected(undefined);
  };
  const selectFeature = (feature: SpatialFeature) => {
    const waterNode = feature.featureType === MapFeatureType.WaterFacility
      ? findWaterSelection(waterSystem, feature.id)
      : undefined;
    if (waterNode?.type === "node") {
      setWaterSelection(waterNode);
      setSelected(undefined);
      setFiltersOpen(false);
      return;
    }
    setSelected(feature);
    setWaterSelection(undefined);
    setFiltersOpen(false);
  };
  const selectSpatial = (selection: WaterSpatialSelection) => {
    setWaterSelection(selection);
    setSelected(undefined);
    setFiltersOpen(false);
  };
  const clearSelection = () => {
    setSelected(undefined);
    setWaterSelection(undefined);
    setSelectionAnchor(undefined);
  };
  const hasSelection = Boolean(selected || waterSelection);
  const relatedWaterIds = useMemo(
    () => waterSelection && waterSystem ? waterSelectionRelatedIds(waterSelection, waterSystem) : [],
    [waterSelection, waterSystem],
  );
  const changeWaterTopicMode = (next: WaterTopicMode) => {
    clearSelection();
    setFiltersOpen(false);
    if (next !== "off") setOverlayMode("aerial");
    onWaterTopicModeChange(next);
  };
  const selectRelatedWaterItem = (id: string) => {
    const next = findWaterSelection(waterSystem, id);
    if (next) selectSpatial(next);
  };
  const bubbleLayout = useMemo(
    () => hasSelection ? computeMapBubbleLayout(selectionAnchor) : undefined,
    [hasSelection, selectionAnchor],
  );
  const detailStyle = bubbleLayout ? ({
    left: bubbleLayout.left,
    top: bubbleLayout.top,
    width: bubbleLayout.width,
    height: bubbleLayout.height,
    "--bubble-arrow-y": `${bubbleLayout.arrowY}px`,
  } as CSSProperties & Record<"--bubble-arrow-y", string>) : undefined;

  return (
    <div className={`map-explorer${activeTopic ? " village-topic-active" : ""}${waterTopicActive ? " water-topic-active" : ""}${hasSelection ? " detail-open" : ""}`} data-shared-spatial-data="points-lines-polygons" data-active-village-topic={activeTopic ?? "off"} data-water-topic-mode={waterTopicMode}>
      {showFilterControls ? (
        <>
          <div className={`map-filter-mobile ${filtersOpen ? "open" : ""}`}>
            <MapFilterPanel filters={filters} availableTypes={availableTypes} counts={counts} onChange={changeFilters} onReset={resetFilters} onClose={() => setFiltersOpen(false)} />
          </div>
          <MapFilterPanel filters={filters} availableTypes={availableTypes} counts={counts} onChange={changeFilters} onReset={resetFilters} />
        </>
      ) : null}
      <div className="map-canvas-wrap">
        <WaterTopicNavigator data={waterSystem} mode={waterTopicMode} onModeChange={changeWaterTopicMode} topicId={activeTopic} featureCount={topicFeatureCount} onTopicClose={onTopicClose} />
        {showFilterControls ? (
          <div className="map-mobile-toolbar">
            <button className="button button-secondary" onClick={() => setFiltersOpen((value) => !value)}><ListFilter size={17} />专题</button>
            <span>{visibleObjectCount} 个要素</span>
          </div>
        ) : null}
        {showBasemapControls ? (
          <div className="map-basemap-control" aria-label="切换二维地图底图">
            <button className={overlayMode === "aerial" ? "active" : ""} onClick={() => setOverlayMode("aerial")} aria-pressed={overlayMode === "aerial"}><ImageIcon size={16} />航拍</button>
            <button className={overlayMode === "handdrawn" ? "active" : ""} onClick={() => setOverlayMode("handdrawn")} aria-pressed={overlayMode === "handdrawn"}><Layers3 size={16} />手绘</button>
            <button className={overlayMode === "satellite" ? "active" : ""} onClick={() => setOverlayMode("satellite")} aria-pressed={overlayMode === "satellite"}><Satellite size={16} />卫星</button>
            <button className={overlayMode === "none" ? "active" : ""} onClick={() => setOverlayMode("none")} aria-pressed={overlayMode === "none"}><MapIcon size={16} />底图</button>
          </div>
        ) : null}
        <AmapVillageMap
          features={visible}
          selectedId={selected?.id ?? (waterSelection?.type === "node" ? waterSelection.item.id : undefined)}
          onSelect={selectFeature}
          overlayMode={overlayMode}
          waterSystem={showWaterSystem ? visibleWaterSystem : undefined}
          selectedSpatialId={waterSelection?.item.id}
          relatedWaterIds={relatedWaterIds}
          onSelectSpatial={selectSpatial}
          onSelectionAnchorChange={setSelectionAnchor}
          onBackgroundClick={clearSelection}
        />
        {datasetsReady && !visibleObjectCount ? (
          <div className="map-empty-overlay">
            <strong>{activeTopic ? "该专题暂无已核实空间资料" : "当前没有显示要素"}</strong>
            <span>{activeTopic ? villageTopicById[activeTopic].emptyMessage : "请在“专题”中重新勾选。"}</span>
          </div>
        ) : null}
        {hasSelection && bubbleLayout ? (
          <div
            className="map-selection-bubble"
            data-bubble-side={bubbleLayout.side}
            data-point-anchor="true"
            style={detailStyle}
          >
            {waterSelection && waterSystem ? (
              <WaterSpatialDetail selection={waterSelection} data={waterSystem} onClose={clearSelection} onSelectRelated={selectRelatedWaterItem} />
            ) : selected ? (
              <MapDetailDrawer
                key={selected.id}
                feature={selected}
                records={topicRecordsForFeature(topicRecords, selected.id)}
                onClose={clearSelection}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
