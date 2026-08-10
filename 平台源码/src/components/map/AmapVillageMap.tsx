"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { MapMarker, type MapMarkerPosition } from "@/components/map/MapMarker";
import { geographicBasemaps, type VillageBasemap, VillageMap } from "@/components/map/VillageMap";
import {
  loadAmap,
  type AmapCoordinate,
  type AmapMapInstance,
  type AmapNamespace,
  type AmapOverlay,
  wgs84ToGcj02,
} from "@/lib/amap";
import type { MapScreenAnchor } from "@/lib/mapBubble";
import {
  type WaterSpatialSelection,
  type WaterSystemData,
  waterLineStyles,
} from "@/lib/spatialData";
import { MapFeatureType, type SpatialFeature } from "@/types";

export type VillageOverlayMode = "none" | "satellite" | VillageBasemap;

type Runtime = {
  AMap: AmapNamespace;
  map: AmapMapInstance;
};

const HONGTANG_CENTER_WGS84: AmapCoordinate = [99.907084, 24.636574];

function averageCoordinate(coordinates: AmapCoordinate[]) {
  if (!coordinates.length) return undefined;
  const totals = coordinates.reduce<AmapCoordinate>(
    (sum, coordinate) => [sum[0] + coordinate[0], sum[1] + coordinate[1]],
    [0, 0],
  );
  return [totals[0] / coordinates.length, totals[1] / coordinates.length] as AmapCoordinate;
}

function dashArray(dash?: string) {
  return dash?.split(/\s+/).map(Number).filter(Number.isFinite);
}

function isAmapAuthorizationError(event: ErrorEvent) {
  const message = `${event.message} ${event.filename}`;
  return /INVALID_USER_KEY|USERKEY|SECURITY_JS_CODE|jscode|AMap.*key/i.test(message);
}

export function AmapVillageMap({
  features,
  selectedId,
  onSelect,
  overlayMode,
  waterSystem,
  selectedSpatialId,
  relatedWaterIds = [],
  onSelectSpatial,
  onSelectionAnchorChange,
  onBackgroundClick,
}: {
  features: SpatialFeature[];
  selectedId?: string;
  onSelect: (feature: SpatialFeature) => void;
  overlayMode: VillageOverlayMode;
  waterSystem?: WaterSystemData;
  selectedSpatialId?: string;
  relatedWaterIds?: string[];
  onSelectSpatial?: (selection: WaterSpatialSelection) => void;
  onSelectionAnchorChange?: (anchor?: MapScreenAnchor) => void;
  onBackgroundClick?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressBackgroundUntil = useRef(0);
  const [runtime, setRuntime] = useState<Runtime>();
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [markerPositions, setMarkerPositions] = useState<Record<string, MapMarkerPosition>>({});

  const suppressBackgroundClick = useCallback(() => {
    // AMap can emit its map-level click after a DOM marker/overlay click has
    // already selected an item. Keep a short time window instead of clearing
    // the guard on the next task, otherwise the newly opened bubble vanishes.
    suppressBackgroundUntil.current = window.performance.now() + 450;
  }, []);

  const fallbackBasemap: VillageBasemap = overlayMode === "handdrawn" ? "handdrawn" : "aerial";
  const relatedWaterIdSet = useMemo(() => new Set(relatedWaterIds), [relatedWaterIds]);
  const hasWaterRelation = Boolean(selectedSpatialId && relatedWaterIds.length);

  const selectedCoordinate = useMemo(() => {
    if (selectedId) {
      const feature = features.find((item) => item.id === selectedId);
      if (feature) return wgs84ToGcj02(feature.longitude, feature.latitude);
    }
    if (selectedSpatialId && waterSystem) {
      const zone = waterSystem.zones.find((item) => item.id === selectedSpatialId);
      if (zone) return averageCoordinate(zone.polygon.map(([longitude, latitude]) => wgs84ToGcj02(longitude, latitude)));
      const line = waterSystem.lines.find((item) => item.id === selectedSpatialId);
      if (line) return averageCoordinate(line.path.map(([longitude, latitude]) => wgs84ToGcj02(longitude, latitude)));
    }
    return undefined;
  }, [features, selectedId, selectedSpatialId, waterSystem]);

  useEffect(() => {
    let active = true;
    let map: AmapMapInstance | undefined;
    let readyTimeout: number | undefined;

    const handleAuthorizationError = (event: ErrorEvent) => {
      if (isAmapAuthorizationError(event)) setStatus("fallback");
    };
    window.addEventListener("error", handleAuthorizationError);

    loadAmap()
      .then((AMap) => {
        if (!active || !containerRef.current) return;
        map = new AMap.Map(containerRef.current, {
          center: wgs84ToGcj02(...HONGTANG_CENTER_WGS84),
          zoom: 16.7,
          zooms: [10, 20],
          viewMode: "2D",
          mapStyle: "amap://styles/normal",
          resizeEnable: true,
          rotateEnable: false,
          pitchEnable: false,
          showLabel: true,
        });
        const markReady = () => {
          if (!active) return;
          if (readyTimeout !== undefined) window.clearTimeout(readyTimeout);
          setRuntime({ AMap, map: map as AmapMapInstance });
          setStatus("ready");
        };
        map.on("complete", markReady);
        readyTimeout = window.setTimeout(markReady, 5000);
      })
      .catch(() => {
        if (active) setStatus("fallback");
      });

    return () => {
      active = false;
      if (readyTimeout !== undefined) window.clearTimeout(readyTimeout);
      window.removeEventListener("error", handleAuthorizationError);
      if (map) {
        const mapToDestroy = map;
        window.setTimeout(() => {
          try {
            mapToDestroy.destroy();
          } catch {
            // AMap may already have released its layers while React is unmounting.
          }
        }, 0);
      }
    };
  }, []);

  useEffect(() => {
    if (!runtime) return;
    const { AMap, map } = runtime;
    if (overlayMode === "none" || overlayMode === "satellite") return;
    const geographic = geographicBasemaps[overlayMode];
    const southWest = wgs84ToGcj02(geographic.bounds.west, geographic.bounds.south);
    const northEast = wgs84ToGcj02(geographic.bounds.east, geographic.bounds.north);
    const layer = new AMap.ImageLayer({
      url: geographic.src,
      bounds: new AMap.Bounds(southWest, northEast),
      opacity: overlayMode === "aerial" ? 0.86 : 0.72,
      zIndex: 8,
      zooms: overlayMode === "aerial" ? [12, 20] : [10, 20],
    });
    map.add(layer);
    return () => map.remove(layer);
  }, [overlayMode, runtime]);

  useEffect(() => {
    if (!runtime || overlayMode !== "satellite") return;
    const { AMap, map } = runtime;
    const layers = [
      new AMap.TileLayer.Satellite({ zIndex: 2, zooms: [3, 20] }),
      new AMap.TileLayer.RoadNet({ zIndex: 3, zooms: [3, 20] }),
    ];
    map.add(layers);
    return () => map.remove(layers);
  }, [overlayMode, runtime]);

  useEffect(() => {
    if (!runtime || !waterSystem) return;
    const { AMap, map } = runtime;
    const overlays: AmapOverlay[] = [];
    const activate = (selection: WaterSpatialSelection) => (event: { originalEvent?: Event }) => {
      event.originalEvent?.preventDefault();
      event.originalEvent?.stopPropagation();
      suppressBackgroundClick();
      onSelectSpatial?.(selection);
    };

    waterSystem.zones.forEach((zone) => {
      const related = relatedWaterIdSet.has(zone.id);
      const active = selectedSpatialId === zone.id;
      const muted = hasWaterRelation && !related;
      const polygon = new AMap.Polygon({
        path: zone.polygon.map(([longitude, latitude]) => wgs84ToGcj02(longitude, latitude)),
        zIndex: active ? 24 : 20,
        fillColor: "#39758a",
        fillOpacity: muted ? 0.04 : active || related ? 0.34 : 0.15,
        strokeColor: active ? "#1d4e89" : related ? "#77daef" : "#ffffff",
        strokeOpacity: muted ? 0.18 : 0.94,
        strokeWeight: active ? 4 : related ? 3 : 2,
        strokeStyle: "dashed",
        strokeDasharray: [10, 7],
        cursor: "pointer",
      });
      polygon.on("click", activate({ type: "zone", item: zone }));
      overlays.push(polygon);
    });

    waterSystem.lines.forEach((line) => {
      const style = waterLineStyles[line.kind];
      const related = relatedWaterIdSet.has(line.id);
      const active = selectedSpatialId === line.id;
      const muted = hasWaterRelation && !related;
      const polyline = new AMap.Polyline({
        path: line.path.map(([longitude, latitude]) => wgs84ToGcj02(longitude, latitude)),
        zIndex: active ? 31 : 28,
        strokeColor: related && !active ? "#77daef" : style.color,
        strokeOpacity: muted ? 0.2 : 0.96,
        strokeWeight: active ? Math.max(style.width + 2, 6) : related ? style.width + 1 : style.width,
        strokeStyle: style.dash ? "dashed" : "solid",
        strokeDasharray: dashArray(style.dash),
        lineJoin: "round",
        lineCap: "round",
        cursor: "pointer",
      });
      polyline.on("click", activate({ type: "line", item: line }));
      overlays.push(polyline);
    });

    if (overlays.length) map.add(overlays);
    return () => {
      if (overlays.length) map.remove(overlays);
    };
  }, [hasWaterRelation, onSelectSpatial, relatedWaterIdSet, runtime, selectedSpatialId, suppressBackgroundClick, waterSystem]);

  const projectMarkersAndSelection = useCallback(() => {
    if (!runtime || !containerRef.current) return;
    const { map } = runtime;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const nextPositions = features.reduce<Record<string, MapMarkerPosition>>((positions, feature) => {
      const pixel = map.lngLatToContainer(wgs84ToGcj02(feature.longitude, feature.latitude));
      const x = pixel.getX();
      const y = pixel.getY();
      positions[feature.id] = {
        x: Math.round(x),
        y: Math.round(y),
        unit: "pixel",
      };
      return positions;
    }, {});
    setMarkerPositions(nextPositions);

    if (!selectedCoordinate) {
      onSelectionAnchorChange?.(undefined);
      return;
    }
    const selectionPixel = map.lngLatToContainer(selectedCoordinate);
    const x = selectionPixel.getX();
    const y = selectionPixel.getY();
    onSelectionAnchorChange?.({
      x,
      y,
      width: rect.width,
      height: rect.height,
      visible: x >= 0 && x <= rect.width && y >= 0 && y <= rect.height,
    });
  }, [features, onSelectionAnchorChange, runtime, selectedCoordinate]);

  useEffect(() => {
    if (!runtime) return;
    const { map } = runtime;
    let animationFrame: number | undefined;
    const scheduleProjection = () => {
      if (animationFrame !== undefined) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = undefined;
        projectMarkersAndSelection();
      });
    };
    scheduleProjection();
    map.on("mapmove", scheduleProjection);
    map.on("zoomchange", scheduleProjection);
    window.addEventListener("resize", scheduleProjection);
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
      scheduleProjection();
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      map.off("mapmove", scheduleProjection);
      map.off("zoomchange", scheduleProjection);
      window.removeEventListener("resize", scheduleProjection);
      resizeObserver.disconnect();
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
    };
  }, [projectMarkersAndSelection, runtime]);

  useEffect(() => {
    if (!runtime) return;
    const handleMapClick = () => {
      if (window.performance.now() < suppressBackgroundUntil.current) return;
      onBackgroundClick?.();
    };
    runtime.map.on("click", handleMapClick);
    return () => runtime.map.off("click", handleMapClick);
  }, [onBackgroundClick, runtime]);

  useEffect(() => {
    if (!runtime || !selectedCoordinate) return;
    const minimumZoom = overlayMode === "handdrawn" ? 16.4 : 17.3;
    runtime.map.setZoomAndCenter(Math.max(runtime.map.getZoom(), minimumZoom), selectedCoordinate, false, 260);
    const updateAnchor = window.setTimeout(projectMarkersAndSelection, 300);
    return () => window.clearTimeout(updateAnchor);
  }, [overlayMode, projectMarkersAndSelection, runtime, selectedCoordinate]);

  const activateFeature = (feature: SpatialFeature, event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    suppressBackgroundClick();
    onSelect(feature);
  };
  const resetView = () => {
    runtime?.map.setZoomAndCenter(16.7, wgs84ToGcj02(...HONGTANG_CENTER_WGS84), false, 260);
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Browsers may reject fullscreen when it is disabled by device policy.
    }
  };

  return (
    <div className={`amap-village-map amap-status-${status}`} data-map-provider={status === "ready" ? "amap" : "local-fallback"} data-overlay-mode={overlayMode}>
      <div className="amap-local-fallback" aria-hidden={status === "ready"}>
        <VillageMap
          features={features}
          selectedId={selectedId}
          onSelect={onSelect}
          basemap={fallbackBasemap}
          waterSystem={waterSystem}
          selectedSpatialId={selectedSpatialId}
          relatedWaterIds={relatedWaterIds}
          onSelectSpatial={onSelectSpatial}
          onSelectionAnchorChange={status === "ready" ? undefined : onSelectionAnchorChange}
          onBackgroundClick={onBackgroundClick}
        />
      </div>
      <div className="amap-cloud-shell">
        <div ref={containerRef} className="amap-cloud-canvas" aria-label="高德云端底图与红塘村专题叠加地图" />
      </div>
      {status === "ready" ? (
        <>
          <div className="amap-react-marker-layer" aria-label="红塘村地点要素">
            {features.map((feature) => {
              const position = markerPositions[feature.id];
              if (!position) return null;
              return (
                <MapMarker
                  key={feature.id}
                  feature={feature}
                  active={feature.id === selectedId}
                  related={relatedWaterIdSet.has(feature.id)}
                  muted={hasWaterRelation && feature.featureType === MapFeatureType.WaterFacility && !relatedWaterIdSet.has(feature.id)}
                  onClick={(event) => activateFeature(feature, event)}
                  position={position}
                  mapScale={1}
                />
              );
            })}
          </div>
          <div className="map-scene-tools" aria-label="二维地图工具">
            <button type="button" className="map-scene-tool" data-tooltip="回到中心" aria-label="回到中心" onClick={resetView}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg>
            </button>
            <button type="button" className="map-scene-tool" data-tooltip={"\u5168\u5c4f\u67e5\u770b"} aria-label={"\u5168\u5c4f\u67e5\u770b"} onClick={toggleFullscreen}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>
            </button>
          </div>
        </>
      ) : null}
      {status === "loading" ? <div className="amap-map-status">正在连接云端底图…</div> : null}
      {status === "fallback" ? <div className="amap-map-status warning">云端底图暂不可用，已显示本地影像</div> : null}
    </div>
  );
}
