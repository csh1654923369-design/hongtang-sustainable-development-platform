"use client";

import { Box, Layers3, Map } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GaussianHome } from "@/components/home/GaussianHome";
import { MapExplorer } from "@/components/map/MapExplorer";
import {
  initialMapFilters,
  MapFilterPanel,
  type MapFilters,
  verifiedMapFeatureTypes,
} from "@/components/map/MapFilterPanel";
import { fetchPlatformDataset } from "@/lib/platformData";
import type { WaterSystemData, WaterTopicMode } from "@/lib/spatialData";
import { MapFeatureType, type SpatialFeature } from "@/types";

type HomeView = "3d" | "2d";

export function HomeExperience() {
  const [view, setView] = useState<HomeView>("2d");
  const [waterTopicMode, setWaterTopicMode] = useState<WaterTopicMode>("off");
  const [filters, setFilters] = useState<MapFilters>(initialMapFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [layerCounts, setLayerCounts] = useState<Partial<Record<MapFeatureType, number>>>({});
  const availableTypes = [...verifiedMapFeatureTypes] as MapFeatureType[];

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
        if (active) setLayerCounts({});
      });
    return () => {
      active = false;
    };
  }, []);

  const waterTopicActive = waterTopicMode !== "off";
  const resetFilters = () => setFilters({ types: [...availableTypes] });

  return (
    <div className="home-experience" data-home-map-mode={view}>
      <div className="home-floating-interface">
        <Link href="/" className="home-floating-brand" aria-label="红塘村可持续发展平台首页">
          <Image className="home-floating-logo" src="/icon.svg" alt="" width={40} height={40} aria-hidden="true" />
          <span className="home-floating-name">红塘村可持续发展平台</span>
        </Link>
        <div className="home-view-toggle" role="group" aria-label="切换首页地图模式">
          <button type="button" className={view === "2d" ? "active" : ""} aria-pressed={view === "2d"} onClick={() => setView("2d")}>
            <Map size={17} aria-hidden="true" />2D地图
          </button>
          <button type="button" className={view === "3d" ? "active" : ""} aria-pressed={view === "3d"} onClick={() => setView("3d")}>
            <Box size={17} aria-hidden="true" />3D实景
          </button>
        </div>
      </div>
      <div
        id="home-shared-map-filter"
        className={`home-shared-map-filter${filterOpen ? " open" : ""}${waterTopicActive ? " topic-hidden" : ""}`}
        data-shared-map-filter="persistent"
        data-selected-layer-types={filters.types.join(",")}
      >
        <MapFilterPanel
          filters={filters}
          availableTypes={availableTypes}
          counts={layerCounts}
          onChange={setFilters}
          onReset={resetFilters}
          onClose={() => setFilterOpen(false)}
          onOpenWaterTopic={() => {
            setFilterOpen(false);
            setWaterTopicMode("overview");
          }}
        />
      </div>
      <button
        type="button"
        className={`home-shared-filter-toggle${waterTopicActive ? " topic-hidden" : ""}`}
        aria-controls="home-shared-map-filter"
        aria-expanded={filterOpen}
        onClick={() => setFilterOpen((current) => !current)}
      >
        <span className="home-topic-entry-icon"><Layers3 size={22} aria-hidden="true" /></span>
        <span className="home-topic-entry-copy">
          <strong>专题</strong>
          <small>已显示{filters.types.length}/{availableTypes.length}类内容</small>
        </span>
      </button>
      {view === "3d"
        ? <GaussianHome filters={filters} waterTopicMode={waterTopicMode} onWaterTopicModeChange={setWaterTopicMode} />
        : <main className="home-map-mode" aria-label="红塘村二维地图"><MapExplorer filters={filters} showFilterControls={false} waterTopicMode={waterTopicMode} onWaterTopicModeChange={setWaterTopicMode} /></main>}
    </div>
  );
}
