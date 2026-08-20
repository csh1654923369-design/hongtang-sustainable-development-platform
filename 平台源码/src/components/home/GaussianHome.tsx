"use client";

import { Box, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { MapDetailDrawer } from "@/components/map/MapDetailDrawer";
import { initialMapFilters, mapFeatureTypeToFilterGroup, verifiedMapFeatureTypes, type MapFilters } from "@/components/map/MapFilterPanel";
import { WaterSpatialDetail } from "@/components/map/WaterSpatialDetail";
import { TopicSpatialDetail } from "@/components/map/TopicSpatialDetail";
import { WaterTopicNavigator } from "@/components/map/WaterTopicNavigator";
import { MapFeatureType, type SpatialFeature } from "@/types";
import { computeMapBubbleLayout, isMapScreenAnchor, type MapScreenAnchor } from "@/lib/mapBubble";
import { fetchPlatformDataset } from "@/lib/platformData";
import { sitePath } from "@/lib/sitePath";
import type { TemporaryMapData } from "@/lib/temporaryMapEdits";
import type { VillageTopicId } from "@/lib/villageTopics";
import {
  findTopicSpatialSelection,
  topicPointFeatures,
  type TopicSpatialData,
  type TopicSpatialSelection,
} from "@/lib/topicSpatialData";
import {
  FieldworkTopicRecord,
  TopicRecordPayload,
  WaterSpatialSelection,
  WaterSystemData,
  WaterTopicMode,
  findWaterSelection,
  topicRecordsForFeature,
  waterFeatureBranch,
  waterNodesToSpatialFeatures,
  waterSelectionRelatedIds,
} from "@/lib/spatialData";

type GaussianState = "loading" | "ready" | "error";
type RealMapPayload = { features?: SpatialFeature[] };
type CesiumPointPayload = Pick<SpatialFeature, "id" | "title" | "featureType" | "longitude" | "latitude"> & {
  waterSystemBranch?: SpatialFeature["waterSystemBranch"];
};
type SentState = { target: Window; signature: string };

export function GaussianHome({
  temporaryMapData,
  filters = initialMapFilters,
  activeTopic,
  topicFeatureCount = 0,
  onTopicClose = () => undefined,
  waterTopicMode = "off",
  onWaterTopicModeChange = () => undefined,
}: {
  temporaryMapData?: TemporaryMapData;
  filters?: MapFilters;
  activeTopic?: VillageTopicId;
  topicFeatureCount?: number;
  onTopicClose?: () => void;
  waterTopicMode?: WaterTopicMode;
  onWaterTopicModeChange?: (mode: WaterTopicMode) => void;
}) {
  const [state, setState] = useState<GaussianState>("loading");
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
  const [selectedFeature, setSelectedFeature] = useState<SpatialFeature>();
  const [selectedSpatial, setSelectedSpatial] = useState<WaterSpatialSelection>();
  const [selectedTopicSpatial, setSelectedTopicSpatial] = useState<TopicSpatialSelection>();
  const [selectionAnchor, setSelectionAnchor] = useState<MapScreenAnchor>();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const sentStateRef = useRef<SentState | undefined>(undefined);
  const selectedPointIdRef = useRef<string | undefined>(undefined);
  const selectedSpatialIdRef = useRef<string | undefined>(undefined);

  const mapFeatures = useMemo(
    () => [...realFeatures, ...waterNodesToSpatialFeatures(waterSystem), ...topicPointFeatures(topicSpatial)],
    [realFeatures, topicSpatial, waterSystem],
  );
  const featuresById = useMemo(
    () => new Map(mapFeatures.map((feature) => [feature.id, feature])),
    [mapFeatures],
  );
  const cesiumPoints = useMemo<CesiumPointPayload[]>(
    () => mapFeatures
      .filter((feature) => Number.isFinite(feature.longitude) && Number.isFinite(feature.latitude))
      .map((feature) => ({
        id: feature.id,
        title: feature.title,
        featureType: feature.featureType,
        longitude: feature.longitude,
        latitude: feature.latitude,
        waterSystemBranch: feature.featureType === MapFeatureType.WaterFacility
          ? waterFeatureBranch(feature)
          : undefined,
      })),
    [mapFeatures],
  );
  const activeFilterGroups = useMemo(
    () => Array.from(new Set(filters.types.map(mapFeatureTypeToFilterGroup))),
    [filters.types],
  );

  const sendFeatureFilters = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: "hongtang-gaussian-filter-groups-set", groups: activeFilterGroups },
      window.location.origin,
    );
  }, [activeFilterGroups]);

  const sendSpatialData = useCallback(() => {
    const target = frameRef.current?.contentWindow;
    if (!target || !cesiumPoints.length) return;
    const signature = JSON.stringify({ points: cesiumPoints, waterSystem, topicSpatial, waterTopicMode });
    if (sentStateRef.current?.target === target && sentStateRef.current.signature === signature) return;
    target.postMessage(
      { type: "hongtang-gaussian-points-set", points: cesiumPoints },
      window.location.origin,
    );
    if (waterSystem || topicSpatial) {
      target.postMessage(
        { type: "hongtang-gaussian-spatial-set", waterSystem, topicSpatial },
        window.location.origin,
      );
    }
    target.postMessage(
      { type: "hongtang-gaussian-water-topic-mode", mode: waterTopicMode },
      window.location.origin,
    );
    sentStateRef.current = { target, signature };
  }, [cesiumPoints, topicSpatial, waterSystem, waterTopicMode]);

  const clearLocalSelection = useCallback(() => {
    selectedPointIdRef.current = undefined;
    selectedSpatialIdRef.current = undefined;
    setSelectedFeature(undefined);
    setSelectedSpatial(undefined);
    setSelectedTopicSpatial(undefined);
    setSelectionAnchor(undefined);
  }, []);

  const clearSelection = useCallback(() => {
    clearLocalSelection();
    const target = frameRef.current?.contentWindow;
    target?.postMessage({ type: "hongtang-gaussian-point-clear" }, window.location.origin);
    target?.postMessage({ type: "hongtang-gaussian-spatial-clear" }, window.location.origin);
    target?.postMessage({ type: "hongtang-gaussian-water-relation-set", ids: [] }, window.location.origin);
    target?.postMessage({ type: "hongtang-gaussian-detail-state", open: false }, window.location.origin);
  }, [clearLocalSelection]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchPlatformDataset<RealMapPayload>(
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
        setLoadedRealFeatures(Array.isArray(mapPayload.features)
          ? mapPayload.features.filter((feature) =>
              verifiedMapFeatureTypes.includes(feature.featureType as (typeof verifiedMapFeatureTypes)[number]),
            )
          : []);
        setLoadedWaterSystem(waterPayload);
        setLoadedTopicSpatial(topicSpatialPayload);
        setTopicRecords(recordPayload?.records ?? []);
      })
      .catch(() => {
        if (!active || temporaryMapData) return;
        setLoadedRealFeatures([]);
        setLoadedWaterSystem(undefined);
        setLoadedTopicSpatial(undefined);
        setTopicRecords([]);
      });
    return () => {
      active = false;
    };
  }, [temporaryMapData]);

  useEffect(() => {
    if (state === "ready") sendSpatialData();
  }, [sendSpatialData, state]);

  useEffect(() => {
    if (state === "ready") sendFeatureFilters();
  }, [sendFeatureFilters, state]);

  useEffect(() => {
    let poller: number | undefined;
    const receiveViewerState = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "hongtang-gaussian-ready") {
        setState("ready");
        sendSpatialData();
        if (poller !== undefined) {
          window.clearInterval(poller);
          poller = undefined;
        }
      }
      if (event.data?.type === "hongtang-gaussian-error") setState("error");
      if (event.data?.type === "hongtang-gaussian-selection-clear") {
        clearLocalSelection();
        frameRef.current?.contentWindow?.postMessage(
          { type: "hongtang-gaussian-detail-state", open: false },
          window.location.origin,
        );
      }
      const selectedId = event.data?.id ?? event.data?.detail;
      if (event.data?.type === "hongtang-gaussian-point-selected" && typeof selectedId === "string") {
        const waterSelection = findWaterSelection(waterSystem, selectedId);
        if (waterSelection?.type === "node") {
          selectedPointIdRef.current = selectedId;
          selectedSpatialIdRef.current = undefined;
          setSelectedSpatial(waterSelection);
          setSelectedTopicSpatial(undefined);
          setSelectedFeature(undefined);
          setSelectionAnchor(isMapScreenAnchor(event.data?.screen) ? event.data.screen : undefined);
          frameRef.current?.contentWindow?.postMessage(
            { type: "hongtang-gaussian-detail-state", open: true },
            window.location.origin,
          );
          return;
        }
        const topicSelection = findTopicSpatialSelection(topicSpatial, selectedId);
        if (topicSelection?.item.geometry.type === "Point") {
          selectedPointIdRef.current = selectedId;
          selectedSpatialIdRef.current = undefined;
          setSelectedSpatial(undefined);
          setSelectedTopicSpatial(topicSelection);
          setSelectedFeature(undefined);
          setSelectionAnchor(isMapScreenAnchor(event.data?.screen) ? event.data.screen : undefined);
          frameRef.current?.contentWindow?.postMessage(
            { type: "hongtang-gaussian-detail-state", open: true },
            window.location.origin,
          );
          return;
        }
        const feature = featuresById.get(selectedId);
        if (!feature) return;
        selectedPointIdRef.current = selectedId;
        selectedSpatialIdRef.current = undefined;
        setSelectedFeature(feature);
        setSelectedSpatial(undefined);
        setSelectedTopicSpatial(undefined);
        setSelectionAnchor(isMapScreenAnchor(event.data?.screen) ? event.data.screen : undefined);
        frameRef.current?.contentWindow?.postMessage(
          { type: "hongtang-gaussian-detail-state", open: true },
          window.location.origin,
        );
      }
      if (event.data?.type === "hongtang-gaussian-spatial-selected" && typeof selectedId === "string") {
        const selection = findWaterSelection(waterSystem, selectedId);
        const topicSelection = findTopicSpatialSelection(topicSpatial, selectedId);
        if (!selection && !topicSelection) return;
        selectedSpatialIdRef.current = selectedId;
        selectedPointIdRef.current = undefined;
        setSelectedSpatial(selection);
        setSelectedTopicSpatial(topicSelection);
        setSelectedFeature(undefined);
        setSelectionAnchor(isMapScreenAnchor(event.data?.screen) ? event.data.screen : undefined);
        frameRef.current?.contentWindow?.postMessage(
          { type: "hongtang-gaussian-detail-state", open: true },
          window.location.origin,
        );
      }
      if (
        event.data?.type === "hongtang-gaussian-point-screen"
        && typeof selectedId === "string"
        && selectedId === selectedPointIdRef.current
      ) {
        setSelectionAnchor(isMapScreenAnchor(event.data) ? event.data : undefined);
      }
      if (
        event.data?.type === "hongtang-gaussian-spatial-screen"
        && typeof selectedId === "string"
        && selectedId === selectedSpatialIdRef.current
      ) {
        setSelectionAnchor(isMapScreenAnchor(event.data) ? event.data : undefined);
      }
    };
    const requestViewerState = () => {
      frameRef.current?.contentWindow?.postMessage(
        { type: "hongtang-gaussian-status-request" },
        window.location.origin,
      );
    };
    window.addEventListener("message", receiveViewerState);
    requestViewerState();
    poller = window.setInterval(requestViewerState, 1000);
    const timeout = window.setTimeout(
      () => setState((current) => current === "loading" ? "error" : current),
      90000,
    );
    return () => {
      window.removeEventListener("message", receiveViewerState);
      if (poller !== undefined) window.clearInterval(poller);
      window.clearTimeout(timeout);
    };
  }, [clearLocalSelection, featuresById, sendSpatialData, topicSpatial, waterSystem]);

  const hasSelection = Boolean(selectedFeature || selectedSpatial || selectedTopicSpatial);
  const relatedWaterIds = useMemo(
    () => selectedSpatial && waterSystem ? waterSelectionRelatedIds(selectedSpatial, waterSystem) : [],
    [selectedSpatial, waterSystem],
  );
  useEffect(() => {
    if (state !== "ready") return;
    frameRef.current?.contentWindow?.postMessage(
      { type: "hongtang-gaussian-water-relation-set", ids: relatedWaterIds },
      window.location.origin,
    );
  }, [relatedWaterIds, state]);
  useEffect(() => {
    if (!hasSelection) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [clearSelection, hasSelection]);

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
  const changeWaterTopicMode = (next: WaterTopicMode) => {
    clearSelection();
    onWaterTopicModeChange(next);
  };
  const selectRelatedWaterItem = (id: string) => {
    frameRef.current?.contentWindow?.postMessage(
      { type: "hongtang-gaussian-water-select", id },
      window.location.origin,
    );
  };

  return (
    <main
      className={`gaussian-home${activeTopic ? " village-topic-active" : ""}${hasSelection ? " detail-open" : ""}`}
      data-gaussian-state={state}
      data-viewer-engine="cesiumjs"
      data-real-point-count={realFeatures.length}
      data-map-element-count={mapFeatures.length + (waterSystem?.lines.length ?? 0) + (waterSystem?.zones.length ?? 0)}
      data-shared-spatial-data="points-lines-polygons"
      data-active-village-topic={activeTopic ?? "off"}
      data-water-topic-mode={waterTopicMode}
    >
      <WaterTopicNavigator data={waterSystem} mode={waterTopicMode} onModeChange={changeWaterTopicMode} topicId={activeTopic} featureCount={topicFeatureCount} onTopicClose={onTopicClose} />
      <iframe
        id="hongtang-gaussian-frame"
        ref={frameRef}
        onLoad={() => {
          sentStateRef.current = undefined;
          setState("loading");
          clearSelection();
          sendSpatialData();
          sendFeatureFilters();
        }}
        className="gaussian-home-frame"
        src={sitePath("/cesium-viewer/index.html?v=shared-filter-v153")}
        title="红塘村三维地形、实景模型和专题要素"
        allow="fullscreen"
        allowFullScreen
      />
      {state === "loading" ? (
        <div className="gaussian-home-loader">
          <LoaderCircle size={30} />
          <strong>正在进入红塘村三维实景</strong>
        </div>
      ) : null}
      {state === "error" ? (
        <div className="gaussian-home-fallback">
          <Box size={30} />
          <strong>三维地形暂时没有完成加载</strong>
          <span>请检查网络连接和 Cesium 配置。你可以重新加载，或先切换到2D地图查看相同专题。</span>
          <div>
            <button className="button button-secondary" onClick={() => window.location.reload()}>
              <RefreshCw size={17} />重新加载
            </button>
          </div>
        </div>
      ) : null}
      {hasSelection && bubbleLayout ? (
        <div
          className="map-selection-bubble"
          data-bubble-side={bubbleLayout.side}
          data-point-anchor="true"
          style={detailStyle}
        >
          {selectedFeature ? (
            <MapDetailDrawer
              feature={selectedFeature}
              records={topicRecordsForFeature(topicRecords, selectedFeature.id)}
              onClose={clearSelection}
              variant="gaussian"
            />
          ) : selectedSpatial && waterSystem ? (
            <WaterSpatialDetail selection={selectedSpatial} data={waterSystem} onClose={clearSelection} onSelectRelated={selectRelatedWaterItem} variant="gaussian" />
          ) : selectedTopicSpatial ? (
            <TopicSpatialDetail selection={selectedTopicSpatial} onClose={clearSelection} />
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
