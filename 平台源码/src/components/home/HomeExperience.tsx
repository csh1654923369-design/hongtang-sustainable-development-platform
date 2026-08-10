"use client";

import { Box, ChevronDown, Image as ImageIcon, Layers3, Map, PencilRuler, Satellite } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapExplorer } from "@/components/map/MapExplorer";
import type { VillageOverlayMode } from "@/components/map/AmapVillageMap";
import {
  createInitialMapFilters,
  MapFilterPanel,
  type MapFilters,
  verifiedMapFeatureTypes,
} from "@/components/map/MapFilterPanel";
import { fetchPlatformDataset } from "@/lib/platformData";
import type { WaterSystemData, WaterTopicMode } from "@/lib/spatialData";
import { countTopicFeatures, villageTopicById, villageTopics, type VillageTopicId } from "@/lib/villageTopics";
import { MapFeatureType, type SpatialFeature } from "@/types";

type HomeView = "3d" | "2d";
const VIEW_SWAP_DELAY_MS = 260;

const GaussianHome = dynamic(
  () => import("@/components/home/GaussianHome").then((module) => module.GaussianHome),
  {
    ssr: false,
    loading: () => (
      <main className="home-map-mode home-map-mode-loading" aria-live="polite">
        正在载入三维实景…
      </main>
    ),
  },
);

export function HomeExperience() {
  const [view, setView] = useState<HomeView>("2d");
  const [renderedView, setRenderedView] = useState<HomeView>("2d");
  const [overlayMode, setOverlayMode] = useState<VillageOverlayMode>("aerial");
  const [activeTopic, setActiveTopic] = useState<VillageTopicId>();
  const [waterTopicMode, setWaterTopicMode] = useState<WaterTopicMode>("off");
  const [filters, setFilters] = useState<MapFilters>(createInitialMapFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [layerCounts, setLayerCounts] = useState<Partial<Record<MapFeatureType, number>>>({});
  const filtersBeforeTopicRef = useRef<MapFilters | undefined>(undefined);
  const viewSwapTimerRef = useRef<number | undefined>(undefined);
  const availableTypes = [...verifiedMapFeatureTypes] as MapFeatureType[];

  useEffect(() => () => {
    if (viewSwapTimerRef.current !== undefined) window.clearTimeout(viewSwapTimerRef.current);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchPlatformDataset<{ features?: SpatialFeature[] }>(
        "hongtang-real-map-features",
        "/data/hongtang-real-map-features.json",
      ),
      fetchPlatformDataset<WaterSystemData>(
        "hongtang-water-system",
        "/data/hongtang-water-system.json",
      ),
    ])
      .then(([mapPayload, waterPayload]) => {
        if (!active) return;
        const next = (mapPayload.features ?? []).reduce<Partial<Record<MapFeatureType, number>>>((counts, feature) => {
          counts[feature.featureType] = (counts[feature.featureType] ?? 0) + 1;
          return counts;
        }, {});
        next[MapFeatureType.WaterFacility] = (next[MapFeatureType.WaterFacility] ?? 0)
          + (waterPayload?.nodes.length ?? 0)
          + (waterPayload?.lines.length ?? 0)
          + (waterPayload?.zones.length ?? 0);
        setLayerCounts(next);
      })
      .catch(() => {
        if (active) {
          setLayerCounts({});
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const topicActive = Boolean(activeTopic);
  const selectedTopicCount = useMemo(
    () => villageTopics.filter((topic) => topic.featureTypes.some((type) => filters.types.includes(type))).length,
    [filters.types],
  );
  const activeTopicFeatureCount = activeTopic ? countTopicFeatures(villageTopicById[activeTopic], layerCounts) : 0;
  const openTopic = (topicId: VillageTopicId) => {
    if (!activeTopic) filtersBeforeTopicRef.current = filters;
    setFilterOpen(false);
    setActiveTopic(topicId);
    setFilters({ types: [...villageTopicById[topicId].featureTypes] });
    setWaterTopicMode(topicId === "water" ? "overview" : "off");
  };
  const closeTopic = () => {
    setActiveTopic(undefined);
    setWaterTopicMode("off");
    if (filtersBeforeTopicRef.current) setFilters(filtersBeforeTopicRef.current);
    filtersBeforeTopicRef.current = undefined;
  };
  const changeView = (nextView: HomeView) => {
    if (nextView === view) return;
    if (viewSwapTimerRef.current !== undefined) {
      window.clearTimeout(viewSwapTimerRef.current);
      viewSwapTimerRef.current = undefined;
    }
    setView(nextView);
    if (nextView === renderedView) return;
    viewSwapTimerRef.current = window.setTimeout(() => {
      setRenderedView(nextView);
      viewSwapTimerRef.current = undefined;
    }, VIEW_SWAP_DELAY_MS);
  };

  return (
    <div
      className="home-experience"
      data-home-map-mode={view}
      data-rendered-home-map-mode={renderedView}
      data-home-map-transitioning={view === renderedView ? "false" : "true"}
      data-active-village-topic={activeTopic ?? "off"}
      aria-busy={view !== renderedView}
    >
      <div className="home-floating-interface">
        <div className="home-floating-left">
          <Link href="/" className="home-floating-brand" aria-label="红塘村可持续发展平台首页">
            <Image className="home-floating-logo" src="/icon.svg" alt="" width={40} height={40} aria-hidden="true" />
            <span className="home-floating-name">红塘村可持续发展平台</span>
          </Link>
        </div>
        <div className="home-map-controls">
          <div className="home-view-toggle" role="group" aria-label="切换首页地图模式">
            <button type="button" className={view === "2d" ? "active" : ""} aria-pressed={view === "2d"} onClick={() => changeView("2d")}>
              <Map size={17} aria-hidden="true" />2D地图
            </button>
            <button type="button" className={view === "3d" ? "active" : ""} aria-pressed={view === "3d"} onClick={() => changeView("3d")}>
              <Box size={17} aria-hidden="true" />3D实景
            </button>
          </div>
          <div
            className={`map-basemap-control home-basemap-control${view === "2d" ? " open" : " collapsed"}`}
            role="group"
            aria-label="切换二维地图底图"
            aria-hidden={view !== "2d"}
          >
            <button type="button" disabled={view !== "2d"} className={overlayMode === "aerial" ? "active" : ""} onClick={() => setOverlayMode("aerial")} aria-pressed={overlayMode === "aerial"}><ImageIcon size={16} />航拍</button>
            <button type="button" disabled={view !== "2d"} className={overlayMode === "handdrawn" ? "active" : ""} onClick={() => setOverlayMode("handdrawn")} aria-pressed={overlayMode === "handdrawn"}><Layers3 size={16} />手绘</button>
            <button type="button" disabled={view !== "2d"} className={overlayMode === "satellite" ? "active" : ""} onClick={() => setOverlayMode("satellite")} aria-pressed={overlayMode === "satellite"}><Satellite size={16} />卫星</button>
            <button type="button" disabled={view !== "2d"} className={overlayMode === "none" ? "active" : ""} onClick={() => setOverlayMode("none")} aria-pressed={overlayMode === "none"}><Map size={16} />底图</button>
          </div>
          <Link
            href="/geolibre-lab"
            target="_blank"
            rel="noopener noreferrer"
            className="home-geolibre-entry"
            aria-label="进入GeoLibre专业地图编辑"
            title="在新窗口打开GeoLibre专业地图编辑"
          >
            <span className="home-geolibre-entry-icon" aria-hidden="true"><PencilRuler size={16} /></span>
            <span className="home-geolibre-entry-copy"><strong>地图编辑</strong><small>GeoLibre专业工具</small></span>
          </Link>
        </div>
      </div>
      <div className={`home-topic-card${filterOpen ? " open" : ""}${topicActive ? " topic-hidden" : ""}`}>
        <button
          type="button"
          className="home-shared-filter-toggle"
          aria-controls="home-shared-map-filter"
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen((current) => !current)}
        >
          <span className="home-topic-entry-icon"><Layers3 size={22} aria-hidden="true" /></span>
          <span className="home-topic-entry-copy">
            <strong>专题</strong>
            <small>已选择{selectedTopicCount}/{villageTopics.length}个专题</small>
          </span>
          <span className={`home-topic-entry-action${filterOpen ? " open" : ""}`}>
            {filterOpen ? "收起" : "展开"}
            <ChevronDown size={15} aria-hidden="true" />
          </span>
        </button>
        <div
          id="home-shared-map-filter"
          className="home-shared-map-filter"
          data-shared-map-filter="persistent"
          data-selected-layer-types={filters.types.join(",")}
        >
          <MapFilterPanel
            filters={filters}
            availableTypes={availableTypes}
            counts={layerCounts}
            onChange={setFilters}
            onReset={() => setFilters({ types: [...availableTypes] })}
            onOpenTopic={openTopic}
            showHeading={false}
          />
        </div>
      </div>
      {renderedView === "3d"
        ? <GaussianHome filters={filters} activeTopic={activeTopic} topicFeatureCount={activeTopicFeatureCount} onTopicClose={closeTopic} waterTopicMode={waterTopicMode} onWaterTopicModeChange={setWaterTopicMode} />
        : <main className="home-map-mode" aria-label="红塘村二维地图"><MapExplorer filters={filters} showFilterControls={false} showBasemapControls={false} overlayMode={overlayMode} onOverlayModeChange={setOverlayMode} activeTopic={activeTopic} topicFeatureCount={activeTopicFeatureCount} onTopicClose={closeTopic} waterTopicMode={waterTopicMode} onWaterTopicModeChange={setWaterTopicMode} /></main>}
    </div>
  );
}
