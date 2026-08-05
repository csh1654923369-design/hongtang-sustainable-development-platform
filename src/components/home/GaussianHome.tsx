"use client";

import { Box, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { MapDetailDrawer } from "@/components/map/MapDetailDrawer";
import { WaterSpatialDetail } from "@/components/map/WaterSpatialDetail";
import type { SpatialFeature } from "@/types";
import {
  FieldworkTopicRecord,
  TopicRecordPayload,
  WaterSpatialSelection,
  WaterSystemData,
  findWaterSelection,
  topicRecordsForFeature,
  waterNodesToSpatialFeatures,
} from "@/lib/spatialData";

type GaussianState = "loading" | "ready" | "error";
type RealMapPayload = { features?: SpatialFeature[] };
type CesiumPointPayload = Pick<SpatialFeature, "id" | "title" | "featureType" | "longitude" | "latitude">;
type ScreenAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
};

type SentState = { target: Window; signature: string };

function validScreenAnchor(screen: unknown): screen is ScreenAnchor {
  if (!screen || typeof screen !== "object") return false;
  const value = screen as Partial<ScreenAnchor>;
  return value.visible === true
    && Number.isFinite(value.x)
    && Number.isFinite(value.y)
    && Number.isFinite(value.width)
    && Number.isFinite(value.height);
}

export function GaussianHome() {
  const [state, setState] = useState<GaussianState>("loading");
  const [realFeatures, setRealFeatures] = useState<SpatialFeature[]>([]);
  const [waterSystem, setWaterSystem] = useState<WaterSystemData>();
  const [topicRecords, setTopicRecords] = useState<FieldworkTopicRecord[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<SpatialFeature>();
  const [selectedSpatial, setSelectedSpatial] = useState<WaterSpatialSelection>();
  const [selectionAnchor, setSelectionAnchor] = useState<ScreenAnchor>();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const sentStateRef = useRef<SentState | undefined>(undefined);
  const selectedPointIdRef = useRef<string | undefined>(undefined);
  const selectedSpatialIdRef = useRef<string | undefined>(undefined);

  const mapFeatures = useMemo(
    () => [...realFeatures, ...waterNodesToSpatialFeatures(waterSystem)],
    [realFeatures, waterSystem],
  );
  const featuresById = useMemo(
    () => new Map(mapFeatures.map((feature) => [feature.id, feature])),
    [mapFeatures],
  );
  const cesiumPoints = useMemo<CesiumPointPayload[]>(
    () => mapFeatures
      .filter((feature) => Number.isFinite(feature.longitude) && Number.isFinite(feature.latitude))
      .map(({ id, title, featureType, longitude, latitude }) => ({
        id,
        title,
        featureType,
        longitude,
        latitude,
      })),
    [mapFeatures],
  );

  const sendSpatialData = useCallback(() => {
    const target = frameRef.current?.contentWindow;
    if (!target || !cesiumPoints.length) return;
    const signature = `${cesiumPoints.map((point) => point.id).join("|")}:${waterSystem?.updatedAt ?? "no-water"}`;
    if (sentStateRef.current?.target === target && sentStateRef.current.signature === signature) return;
    target.postMessage(
      { type: "hongtang-gaussian-points-set", points: cesiumPoints },
      window.location.origin,
    );
    if (waterSystem) {
      target.postMessage(
        { type: "hongtang-gaussian-spatial-set", waterSystem },
        window.location.origin,
      );
    }
    sentStateRef.current = { target, signature };
  }, [cesiumPoints, waterSystem]);

  const clearSelection = useCallback(() => {
    selectedPointIdRef.current = undefined;
    selectedSpatialIdRef.current = undefined;
    setSelectedFeature(undefined);
    setSelectedSpatial(undefined);
    setSelectionAnchor(undefined);
    const target = frameRef.current?.contentWindow;
    target?.postMessage({ type: "hongtang-gaussian-point-clear" }, window.location.origin);
    target?.postMessage({ type: "hongtang-gaussian-spatial-clear" }, window.location.origin);
    target?.postMessage({ type: "hongtang-gaussian-detail-state", open: false }, window.location.origin);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/data/hongtang-real-map-features.json", { cache: "no-store" })
        .then((response) => response.ok ? response.json() as Promise<RealMapPayload> : { features: [] }),
      fetch("/data/hongtang-water-system.json", { cache: "no-store" })
        .then((response) => response.ok ? response.json() as Promise<WaterSystemData> : undefined),
      fetch("/data/hongtang-topic-records.json", { cache: "no-store" })
        .then((response) => response.ok ? response.json() as Promise<TopicRecordPayload> : undefined),
    ])
      .then(([mapPayload, waterPayload, recordPayload]) => {
        if (!active) return;
        setRealFeatures(Array.isArray(mapPayload.features) ? mapPayload.features : []);
        setWaterSystem(waterPayload);
        setTopicRecords(recordPayload?.records ?? []);
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

  useEffect(() => {
    if (state === "ready") sendSpatialData();
  }, [sendSpatialData, state]);

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
      const selectedId = event.data?.id ?? event.data?.detail;
      if (event.data?.type === "hongtang-gaussian-point-selected" && typeof selectedId === "string") {
        const feature = featuresById.get(selectedId);
        if (!feature) return;
        selectedPointIdRef.current = selectedId;
        selectedSpatialIdRef.current = undefined;
        setSelectedFeature(feature);
        setSelectedSpatial(undefined);
        setSelectionAnchor(validScreenAnchor(event.data?.screen) ? event.data.screen : undefined);
        frameRef.current?.contentWindow?.postMessage(
          { type: "hongtang-gaussian-detail-state", open: true },
          window.location.origin,
        );
      }
      if (event.data?.type === "hongtang-gaussian-spatial-selected" && typeof selectedId === "string") {
        const selection = findWaterSelection(waterSystem, selectedId);
        if (!selection) return;
        selectedSpatialIdRef.current = selectedId;
        selectedPointIdRef.current = undefined;
        setSelectedSpatial(selection);
        setSelectedFeature(undefined);
        setSelectionAnchor(validScreenAnchor(event.data?.screen) ? event.data.screen : undefined);
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
        setSelectionAnchor(validScreenAnchor(event.data) ? event.data : undefined);
      }
      if (
        event.data?.type === "hongtang-gaussian-spatial-screen"
        && typeof selectedId === "string"
        && selectedId === selectedSpatialIdRef.current
      ) {
        setSelectionAnchor(validScreenAnchor(event.data) ? event.data : undefined);
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
  }, [featuresById, sendSpatialData, waterSystem]);

  const hasSelection = Boolean(selectedFeature || selectedSpatial);
  useEffect(() => {
    if (!hasSelection) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [clearSelection, hasSelection]);

  const bubbleLayout = useMemo(() => {
    if (!hasSelection || !selectionAnchor?.visible) return undefined;
    const margin = 12;
    const gap = 22;
    const width = Math.min(380, selectionAnchor.width - margin * 2);
    const height = Math.min(560, Math.max(180, selectionAnchor.height - margin * 2));
    if (width < 180 || height < 120) return undefined;
    const side = selectionAnchor.x + gap + width <= selectionAnchor.width - margin ? "right" : "left";
    const desiredLeft = side === "right"
      ? selectionAnchor.x + gap
      : selectionAnchor.x - gap - width;
    const left = Math.max(margin, Math.min(desiredLeft, selectionAnchor.width - width - margin));
    const desiredTop = selectionAnchor.y - 72;
    const top = Math.max(margin, Math.min(desiredTop, selectionAnchor.height - height - margin));
    const arrowY = Math.max(22, Math.min(selectionAnchor.y - top, height - 22));
    return { side, left, top, width, height, arrowY };
  }, [hasSelection, selectionAnchor]);
  const detailStyle = bubbleLayout ? ({
    left: bubbleLayout.left,
    top: bubbleLayout.top,
    width: bubbleLayout.width,
    height: bubbleLayout.height,
    "--bubble-arrow-y": `${bubbleLayout.arrowY}px`,
  } as CSSProperties & Record<"--bubble-arrow-y", string>) : undefined;

  return (
    <main
      className={`gaussian-home${hasSelection ? " detail-open" : ""}`}
      data-gaussian-state={state}
      data-viewer-engine="cesiumjs"
      data-real-point-count={realFeatures.length}
      data-map-element-count={mapFeatures.length + (waterSystem?.lines.length ?? 0) + (waterSystem?.zones.length ?? 0)}
      data-shared-spatial-data="points-lines-polygons"
    >
      <iframe
        id="hongtang-gaussian-frame"
        ref={frameRef}
        onLoad={() => {
          sentStateRef.current = undefined;
          setState("loading");
          clearSelection();
          sendSpatialData();
        }}
        className="gaussian-home-frame"
        src="/cesium-viewer/index.html?v=shared-spatial-v146"
        title="红塘村三维地形、实景模型和专题要素"
        allow="fullscreen"
        allowFullScreen
      />
      {state === "loading" ? (
        <div className="gaussian-home-loader">
          <LoaderCircle size={30} />
          <strong>正在进入红塘村三维实景</strong>
          <span>Cesium 正在载入地形、高斯模型以及共用的点、线、面专题，请稍候。</span>
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
          className="gaussian-home-point-detail"
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
            <WaterSpatialDetail selection={selectedSpatial} data={waterSystem} onClose={clearSelection} variant="gaussian" />
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
