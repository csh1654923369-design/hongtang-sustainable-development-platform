"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo } from "react";
import { MapFeatureType, SpatialFeature } from "@/types";
import { MapMarker } from "@/components/map/MapMarker";
import { useMapZoom } from "@/components/map/useMapZoom";
import type { MapScreenAnchor } from "@/lib/mapBubble";
import {
  WaterSpatialSelection,
  WaterSystemData,
  waterLineStyles,
} from "@/lib/spatialData";

export type VillageBasemap = "aerial" | "handdrawn";

export type GeographicBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export const geographicBasemaps: Record<VillageBasemap, { bounds: GeographicBounds; src: string; alt: string; width: number; height: number; title: string; note: string }> = {
  handdrawn: {
    bounds: { west: 99.87903589790675, south: 24.626466269999977, east: 99.92124683196907, north: 24.685577823254807 },
    src: "/data/hongtang-handdrawn-map.png",
    alt: "红塘村手绘地图",
    width: 2048,
    height: 2870,
    title: "红塘村手绘地图",
    note: "点、线、面均按同一组经纬度定位",
  },
  aerial: {
    bounds: { west: 99.902144, south: 24.63173, east: 99.912024, north: 24.641417 },
    src: "/data/hongtang-orthophoto-0.3m.webp",
    alt: "红塘村无人机正射影像",
    width: 3357,
    height: 3554,
    title: "红塘村无人机正射影像",
    note: "0.3米展示版 · 点线面共用坐标",
  },
};

function positionOnBasemap(longitude: number, latitude: number, bounds: GeographicBounds) {
  if (
    longitude < bounds.west
    || longitude > bounds.east
    || latitude < bounds.south
    || latitude > bounds.north
  ) return undefined;
  return {
    x: ((longitude - bounds.west) / (bounds.east - bounds.west)) * 100,
    y: ((bounds.north - latitude) / (bounds.north - bounds.south)) * 100,
  };
}

export function VillageMap({
  features,
  selectedId,
  onSelect,
  onMapClick,
  interactiveLocation = false,
  basemap = "handdrawn",
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
  onMapClick?: (x: number, y: number) => void;
  interactiveLocation?: boolean;
  basemap?: VillageBasemap;
  waterSystem?: WaterSystemData;
  selectedSpatialId?: string;
  relatedWaterIds?: string[];
  onSelectSpatial?: (selection: WaterSpatialSelection) => void;
  onSelectionAnchorChange?: (anchor?: MapScreenAnchor) => void;
  onBackgroundClick?: () => void;
}) {
  const { containerRef, frameRef, frameStyle, viewChanged, scale, isTransitioning, reset, focusAt, panHandlers } = useMapZoom();

  useEffect(() => {
    reset();
  }, [basemap, reset]);

  const clickMap = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, [role='button']")) return;
    if (!interactiveLocation || !onMapClick) {
      onBackgroundClick?.();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    onMapClick(
      ((event.clientX - rect.left) / rect.width) * 100,
      ((event.clientY - rect.top) / rect.height) * 100,
    );
  };
  const geographic = geographicBasemaps[basemap];
  const project = (longitude: number, latitude: number): [number, number] => [
    ((longitude - geographic.bounds.west) / (geographic.bounds.east - geographic.bounds.west)) * geographic.width,
    ((geographic.bounds.north - latitude) / (geographic.bounds.north - geographic.bounds.south)) * geographic.height,
  ];
  const activate = (selection: WaterSpatialSelection) => onSelectSpatial?.(selection);
  const relatedWaterIdSet = useMemo(() => new Set(relatedWaterIds), [relatedWaterIds]);
  const hasWaterRelation = Boolean(selectedSpatialId && relatedWaterIds.length);
  const selectedPosition = useMemo(() => {
    if (selectedId) {
      const feature = features.find((item) => item.id === selectedId);
      if (feature) return positionOnBasemap(feature.longitude, feature.latitude, geographic.bounds);
    }
    if (selectedSpatialId && waterSystem) {
      const zone = waterSystem.zones.find((item) => item.id === selectedSpatialId);
      const line = waterSystem.lines.find((item) => item.id === selectedSpatialId);
      const coordinates = zone?.polygon ?? line?.path;
      if (coordinates?.length) {
        const [longitude, latitude] = coordinates.reduce(
          (sum, coordinate) => [sum[0] + coordinate[0], sum[1] + coordinate[1]],
          [0, 0],
        ).map((value) => value / coordinates.length);
        return positionOnBasemap(longitude, latitude, geographic.bounds);
      }
    }
    return undefined;
  }, [features, geographic.bounds, selectedId, selectedSpatialId, waterSystem]);

  useEffect(() => {
    if (selectedPosition) focusAt(selectedPosition.x, selectedPosition.y);
  }, [focusAt, selectedId, selectedPosition, selectedSpatialId]);

  const reportSelectionAnchor = useCallback(() => {
    if (!selectedPosition || !containerRef.current || !frameRef.current) {
      onSelectionAnchorChange?.(undefined);
      return;
    }
    const stageRect = containerRef.current.getBoundingClientRect();
    const frameRect = frameRef.current.getBoundingClientRect();
    const x = frameRect.left - stageRect.left + frameRect.width * selectedPosition.x / 100;
    const y = frameRect.top - stageRect.top + frameRect.height * selectedPosition.y / 100;
    onSelectionAnchorChange?.({
      x,
      y,
      width: stageRect.width,
      height: stageRect.height,
      visible: x >= 0 && x <= stageRect.width && y >= 0 && y <= stageRect.height,
    });
  }, [containerRef, frameRef, onSelectionAnchorChange, selectedPosition]);

  useEffect(() => {
    let animationFrame: number | undefined;
    const update = () => {
      reportSelectionAnchor();
      if (isTransitioning) animationFrame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("resize", reportSelectionAnchor);
    return () => {
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", reportSelectionAnchor);
    };
  }, [frameStyle.transform, isTransitioning, reportSelectionAnchor]);

  return (
    <div className={`village-map basemap-${basemap} ${interactiveLocation ? "location-mode" : ""}`} onClick={clickMap}>
      <div
        className={`map-geographic-stage ${viewChanged ? "view-changed" : ""}`}
        role="img"
        aria-label={geographic.alt}
        ref={containerRef}
        {...panHandlers}
      >
        <div
          className={`map-geographic-frame map-geographic-frame-${basemap}`}
          ref={frameRef}
          style={{ aspectRatio: `${geographic.width} / ${geographic.height}`, ...frameStyle }}
        >
          <Image
            src={geographic.src}
            alt={geographic.alt}
            width={geographic.width}
            height={geographic.height}
            unoptimized
            draggable={false}
          />
          {waterSystem ? (
            <svg
              className="map-geographic-vector"
              viewBox={`0 0 ${geographic.width} ${geographic.height}`}
              preserveAspectRatio="none"
              aria-label="村里用水矢量专题"
            >
              {waterSystem.zones.map((zone) => (
                <polygon
                  key={zone.id}
                  className={`home-water-zone ${selectedSpatialId === zone.id ? "active" : ""} ${relatedWaterIdSet.has(zone.id) ? "related" : ""} ${hasWaterRelation && !relatedWaterIdSet.has(zone.id) ? "relation-muted" : ""}`}
                  points={zone.polygon.map(([longitude, latitude]) => project(longitude, latitude).join(",")).join(" ")}
                  role="button"
                  tabIndex={0}
                  onClick={() => activate({ type: "zone", item: zone })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") activate({ type: "zone", item: zone });
                  }}
                ><title>{zone.title}</title></polygon>
              ))}
              {waterSystem.lines.map((line) => {
                const style = waterLineStyles[line.kind];
                const points = line.path.map(([longitude, latitude]) => project(longitude, latitude).join(",")).join(" ");
                const selection = { type: "line", item: line } as const;
                return (
                  <g key={line.id} role="button" tabIndex={0} onClick={() => activate(selection)} onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") activate(selection);
                  }}>
                    <polyline className="home-water-line-hit" points={points} />
                    <polyline
                      className={`home-water-line ${selectedSpatialId === line.id ? "active" : ""} ${relatedWaterIdSet.has(line.id) ? "related" : ""} ${hasWaterRelation && !relatedWaterIdSet.has(line.id) ? "relation-muted" : ""}`}
                      points={points}
                      stroke={style.color}
                      strokeWidth={style.width}
                      strokeDasharray={style.dash}
                    ><title>{line.title}</title></polyline>
                  </g>
                );
              })}
            </svg>
          ) : null}
          {features.map((feature) => {
            const position = positionOnBasemap(feature.longitude, feature.latitude, geographic.bounds);
            return position
              ? <MapMarker
                  key={feature.id}
                  feature={feature}
                  active={feature.id === selectedId}
                  related={relatedWaterIdSet.has(feature.id)}
                  muted={hasWaterRelation && feature.featureType === MapFeatureType.WaterFacility && !relatedWaterIdSet.has(feature.id)}
                  onClick={() => onSelect(feature)}
                  position={position}
                  mapScale={scale}
                />
              : null;
          })}
        </div>
        {viewChanged ? (
          <button type="button" className="map-zoom-reset" onClick={reset}>复位视图 · {scale.toFixed(1)}×</button>
        ) : (
          <span className="map-zoom-hint">按住左键拖动 · 滚轮缩放 · 双击复位</span>
        )}
      </div>
      <div className="map-aerial-label"><strong>{geographic.title}</strong><span>{geographic.note}</span></div>
      {interactiveLocation ? <div className="map-location-help">点击地图选择记录位置</div> : null}
    </div>
  );
}
