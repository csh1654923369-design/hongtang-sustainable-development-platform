"use client";

import { Box, Map } from "lucide-react";
import { useState } from "react";
import { GaussianHome } from "@/components/home/GaussianHome";
import { MapExplorer } from "@/components/map/MapExplorer";

type HomeView = "3d" | "2d";

export function HomeExperience() {
  const [view, setView] = useState<HomeView>("3d");

  return (
    <div className="home-experience" data-home-map-mode={view}>
      <div className="home-view-toggle" role="group" aria-label="切换首页地图模式">
        <button type="button" className={view === "3d" ? "active" : ""} aria-pressed={view === "3d"} onClick={() => setView("3d")}>
          <Box size={17} aria-hidden="true" />3D实景
        </button>
        <button type="button" className={view === "2d" ? "active" : ""} aria-pressed={view === "2d"} onClick={() => setView("2d")}>
          <Map size={17} aria-hidden="true" />2D地图
        </button>
      </div>
      {view === "3d"
        ? <GaussianHome />
        : <main className="home-map-mode" aria-label="红塘村二维地图"><MapExplorer /></main>}
    </div>
  );
}
