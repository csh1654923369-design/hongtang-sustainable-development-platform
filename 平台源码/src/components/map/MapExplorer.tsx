"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Image as ImageIcon, Layers3, ListFilter, Map as MapIcon, Satellite } from "lucide-react";
import { MapFeatureType, SpatialFeature } from "@/types";
import { createInitialMapFilters, MapFilterPanel, MapFilters, verifiedMapFeatureTypes } from "@/components/map/MapFilterPanel";
import {
  AmapVillageMap,
  type VillageBaseLayerMode,
  type VillageOverlayMode,
} from "@/components/map/AmapVillageMap";
import { MapDetailDrawer } from "@/components/map/MapDetailDrawer";
import { WaterSpatialDetail } from "@/components/map/WaterSpatialDetail";
import { TopicSpatialDetail } from "@/components/map/TopicSpatialDetail";
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
import type { TemporaryMapData } from "@/lib/temporaryMapEdits";
import { villageTopicById, villageTopics, type VillageTopicId } from "@/lib/villageTopics";
import {
  filterTopicSpatialData,
  findTopicSpatialSelection,
  topicPointFeatures,
  type TopicSpatialData,
  type TopicSpatialSelection,
} from "@/lib/topicSpatialData";

function villageTopicsFromFilters(types: MapFeatureType[]): VillageTopicId[] {
  return villageTopics.filter((topic) => topic.featureTypes.some((type) => types.includes(type))).map((topic) => topic.id);
}

export function MapExplorer({
  temporaryMapData,
  filters: controlledFilters,
  onFiltersChange,
  showFilterControls = true,
  showBasemapControls = true,
  overlayMode: controlledOverlayMode,
  onOverlayModeChange,
  baseLayerMode: controlledBaseLayerMode,
  onBaseLayerModeChange,
  activeTopic,
  topicFeatureCount = 0,
  onTopicClose = () => undefined,
  waterTopicMode = "off",
  onWaterTopicModeChange = () => undefined,
}: {
  temporaryMapData?: TemporaryMapData;
  filters?: MapFilters;
  onFiltersChange?: (filters: MapFilters) => void;
  showFilterControls?: boolean;
  showBasemapControls?: boolean;
  overlayMode?: VillageOverlayMode;
  onOverlayModeChange?: (mode: VillageOverlayMode) => void;
  baseLayerMode?: VillageBaseLayerMode;
  onBaseLayerModeChange?: (mode: VillageBaseLayerMode) => void;
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
  const [topicSpatialSelection, setTopicSpatialSelection] = useState<TopicSpatialSelection>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localOverlayMode, setLocalOverlayMode] = useState<VillageOverlayMode>("aerial");
  const overlayMode = controlledOverlayMode ?? localOverlayMode;
  const setOverlayMode = onOverlayModeChange ?? setLocalOverlayMode;
  const [localBaseLayerMode, setLocalBaseLayerMode] = useState<VillageBaseLayerMode>("satellite");
  const baseLayerMode = controlledBaseLayerMode ?? localBaseLayerMode;
  const setBaseLayerMode = onBaseLayerModeChange ?? setLocalBaseLayerMode;
  const [loadedRealFeatures, setLoadedRealFeatures] = useState<SpatialFeature[]>([]);
  const [loadedWaterSystem, setLoadedWaterSystem] = useState<WaterSystemData>();
  const [loadedTopicSpatial, setLoadedTopicSpatial] = useState<TopicSpatialData>();
  const temporaryRealFeatures = useMemo(() => temporaryMapData?.features.filter((feature) =>
    verifiedMapFeatureTypes.includes(feature.featureType as (typeof verifiedMapFeatureTypes)[number]),
  ), [temporaryMapData]);
  const realFeatures = temporaryRealFeatures ?? loadedRealFeatures;
  const waterSystem = temporaryMapData?.waterSystem ?? loadedWaterSystem;
  const topicSpatial = temporaryMapData?.topicSpatial ?? loadedTopicSpatial;
  const [topicRecords, setTopicRecords] = useState<FieldworkTopicRecord[]>([]);
  const [datasetsReady, setDatasetsReady] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<MapScreenAnchor>();
  const detailDialogRef = useRef<HTMLDivElement>(null);
  const lastSelectedMarkerId = useRef<string | undefined>(undefined);


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
      fetchPlatformDataset<TopicSpatialData>(
        "hongtang-topic-spatial-demo",
        "/data/hongtang-topic-spatial-demo.json",
      ),
    ])
      .then(([mapPayload, waterPayload, recordPayload, topicSpatialPayload]) => {
        if (!active || temporaryMapData) return;
        const verified = mapPayload.features.filter((feature) =>
          verifiedMapFeatureTypes.includes(feature.featureType as (typeof verifiedMapFeatureTypes)[number]),
        );
        setLoadedRealFeatures(verified);
        setLoadedWaterSystem(waterPayload);
        setLoadedTopicSpatial(topicSpatialPayload);
        setTopicRecords(recordPayload.records ?? []);
        setDatasetsReady(true);
      })
      .catch(() => {
        if (!active || temporaryMapData) return;
        setLoadedRealFeatures([]);
        setLoadedWaterSystem(undefined);
        setLoadedTopicSpatial(undefined);
        setTopicRecords([]);
        setDatasetsReady(true);
      });
    return () => {
      active = false;
    };
  }, [temporaryMapData]);

  const allFeatures = useMemo(
    () => [...realFeatures, ...waterNodesToSpatialFeatures(waterSystem), ...topicPointFeatures(topicSpatial)],
    [realFeatures, topicSpatial, waterSystem],
  );
  const topicWaterSystem = useMemo(
    () => filterWaterSystem(waterSystem, waterTopicMode),
    [waterSystem, waterTopicMode],
  );
  const waterTopicActive = activeTopic === "water" && waterTopicMode !== "off";
  const visibleTopicIds = useMemo(() => activeTopic
    ? [activeTopic]
    : villageTopicsFromFilters(filters.types), [activeTopic, filters.types]);
  const visibleTopicSpatial = useMemo(
    () => filterTopicSpatialData(topicSpatial, visibleTopicIds),
    [topicSpatial, visibleTopicIds],
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
  const visibleTopicSpatialVectorCount = visibleTopicSpatial?.features.filter(
    (feature) => feature.geometry.type !== "Point",
  ).length ?? 0;
  const visibleObjectCount = visible.length + visibleTopicSpatialVectorCount + (showWaterSystem
    ? (visibleWaterSystem?.lines.length ?? 0) + (visibleWaterSystem?.zones.length ?? 0)
    : 0);
  const resetFilters = useCallback(() => updateFilters({ types: [...availableTypes] }), [availableTypes, updateFilters]);
  const changeFilters = useCallback((next: MapFilters) => {
    updateFilters(next);
    if (!next.types.includes(MapFeatureType.WaterFacility)) setWaterSelection(undefined);
    setSelected((current) => current && !next.types.includes(current.featureType) ? undefined : current);
  }, [updateFilters]);
  const selectFeature = useCallback((feature: SpatialFeature) => {
    lastSelectedMarkerId.current = feature.id;
    const topicSelection = findTopicSpatialSelection(topicSpatial, feature.id);
    if (topicSelection) {
      setTopicSpatialSelection(topicSelection);
      setWaterSelection(undefined);
      setSelected(undefined);
      setFiltersOpen(false);
      return;
    }
    const waterNode = feature.featureType === MapFeatureType.WaterFacility
      ? findWaterSelection(waterSystem, feature.id)
      : undefined;
    if (waterNode?.type === "node") {
      setWaterSelection(waterNode);
      setTopicSpatialSelection(undefined);
      setSelected(undefined);
      setFiltersOpen(false);
      return;
    }
    setSelected(feature);
    setWaterSelection(undefined);
    setTopicSpatialSelection(undefined);
    setFiltersOpen(false);
  }, [topicSpatial, waterSystem]);
  const selectSpatial = useCallback((selection: WaterSpatialSelection) => {
    if (selection.type === "node") lastSelectedMarkerId.current = selection.item.id;
    setWaterSelection(selection);
    setTopicSpatialSelection(undefined);
    setSelected(undefined);
    setFiltersOpen(false);
  }, []);
  const selectTopicSpatial = useCallback((selection: TopicSpatialSelection) => {
    lastSelectedMarkerId.current = selection.item.id;
    setTopicSpatialSelection(selection);
    setWaterSelection(undefined);
    setSelected(undefined);
    setFiltersOpen(false);
  }, []);
  const clearSelection = useCallback(() => {
    const markerId = lastSelectedMarkerId.current;
    setSelected(undefined);
    setWaterSelection(undefined);
    setTopicSpatialSelection(undefined);
    setSelectionAnchor(undefined);
    window.requestAnimationFrame(() => {
      if (!markerId) return;
      const marker = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-feature-id]"))
        .find((item) => item.dataset.featureId === markerId);
      marker?.focus({ preventScroll: true });
    });
  }, []);
  const hasSelection = Boolean(selected || waterSelection || topicSpatialSelection);
  const relatedWaterIds = useMemo(
    () => waterSelection && waterSystem ? waterSelectionRelatedIds(waterSelection, waterSystem) : [],
    [waterSelection, waterSystem],
  );
  const changeWaterTopicMode = useCallback((next: WaterTopicMode) => {
    clearSelection();
    setFiltersOpen(false);
    onWaterTopicModeChange(next);
  }, [clearSelection, onWaterTopicModeChange]);
  const selectRelatedWaterItem = useCallback((id: string) => {
    const next = findWaterSelection(waterSystem, id);
    if (next) selectSpatial(next);
  }, [selectSpatial, waterSystem]);
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
  const detailTitle = waterSelection?.item.title ?? topicSpatialSelection?.item.title ?? selected?.title ?? "地图要素详情";

  useEffect(() => {
    if (!hasSelection) return;
    const focusTimer = window.setTimeout(() => {
      detailDialogRef.current?.focus({ preventScroll: true });
    }, 320);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      clearSelection();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [clearSelection, hasSelection]);

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
          <div className="map-basemap-control" aria-label="切换二维地图图层">
            <div className="map-layer-choice-group" data-layer-choice-group="village-imagery" role="group" aria-label="村庄影像二选一">
              <button className={overlayMode === "aerial" ? "active" : ""} onClick={() => setOverlayMode("aerial")} aria-pressed={overlayMode === "aerial"}><ImageIcon size={16} />航拍</button>
              <button className={overlayMode === "handdrawn" ? "active" : ""} onClick={() => setOverlayMode("handdrawn")} aria-pressed={overlayMode === "handdrawn"}><Layers3 size={16} />手绘</button>
            </div>
            <div className="map-layer-choice-group" data-layer-choice-group="cloud-basemap" role="group" aria-label="云端底图二选一">
              <button className={baseLayerMode === "satellite" ? "active" : ""} onClick={() => setBaseLayerMode("satellite")} aria-pressed={baseLayerMode === "satellite"}><Satellite size={16} />卫星</button>
              <button className={baseLayerMode === "base" ? "active" : ""} onClick={() => setBaseLayerMode("base")} aria-pressed={baseLayerMode === "base"}><MapIcon size={16} />底图</button>
            </div>
          </div>
        ) : null}
        <AmapVillageMap
          features={visible}
          selectedId={selected?.id ?? (waterSelection?.type === "node" ? waterSelection.item.id : undefined)}
          onSelect={selectFeature}
          overlayMode={overlayMode}
          baseLayerMode={baseLayerMode}
          waterSystem={showWaterSystem ? visibleWaterSystem : undefined}
          topicSpatial={visibleTopicSpatial}
          selectedTopicSpatialId={topicSpatialSelection?.item.id}
          onSelectTopicSpatial={selectTopicSpatial}
          selectedSpatialId={waterSelection?.item.id}
          relatedWaterIds={relatedWaterIds}
          onSelectSpatial={selectSpatial}
          onSelectionAnchorChange={setSelectionAnchor}
          onBackgroundClick={clearSelection}
          viewResetKey={`${activeTopic ?? "all"}:${waterTopicMode}`}
        />
        {(datasetsReady || Boolean(temporaryMapData)) && !visibleObjectCount ? (
          <div className="map-empty-overlay">
            <strong>{activeTopic ? "该专题暂无已核实空间资料" : "当前没有显示要素"}</strong>
            <span>{activeTopic ? villageTopicById[activeTopic].emptyMessage : "请在“专题”中重新勾选。"}</span>
          </div>
        ) : null}
        {hasSelection && bubbleLayout ? (
          <div
            ref={detailDialogRef}
            className="map-selection-bubble"
            data-bubble-side={bubbleLayout.side}
            data-point-anchor="true"
            style={detailStyle}
            role="dialog"
            aria-modal="false"
            aria-label={`${detailTitle}详情`}
            tabIndex={-1}
          >
            {waterSelection && waterSystem ? (
              <WaterSpatialDetail selection={waterSelection} data={waterSystem} onClose={clearSelection} onSelectRelated={selectRelatedWaterItem} />
            ) : topicSpatialSelection ? (
              <TopicSpatialDetail selection={topicSpatialSelection} onClose={clearSelection} />
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
