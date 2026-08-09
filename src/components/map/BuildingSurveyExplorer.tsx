"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Database,
  MapPin,
  RotateCcw,
  Ruler,
  Search,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type BuildingKind = "old" | "new";
type BuildingFilter = "all" | BuildingKind;
type ViewBox = { x: number; y: number; width: number; height: number };

interface SurveyBuilding {
  id: string;
  kind: BuildingKind;
  heightM: number;
  areaM2: number;
  center: {
    x: number;
    y: number;
    longitude: number;
    latitude: number;
  };
  path: string;
}

interface BuildingSurveyData {
  meta: {
    title: string;
    source: string;
    sourceGeneratedAt: string | null;
    generatedAt: string;
    privacyNote: string;
    buildingCount: number;
    stats: {
      oldCount: number;
      newCount: number;
      averageHeightM: number;
    };
  };
  canvas: { width: number; height: number };
  buildings: SurveyBuilding[];
}
interface SafeBuildingFeatureCollection {
  type: "FeatureCollection";
  meta: BuildingSurveyData["meta"];
  bbox: [number, number, number, number];
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][] | number[][][][];
    };
    properties: {
      id: string;
      kind: BuildingKind;
      heightM: number;
      areaM2: number;
      centerLongitude: number;
      centerLatitude: number;
    };
  }>;
}

function transformSafeGeoJson(payload: SafeBuildingFeatureCollection): BuildingSurveyData {
  const [west, south, east, north] = payload.bbox;
  const canvasHeight = 1000;
  const metricAspect = ((east - west) * Math.cos(((south + north) / 2) * Math.PI / 180)) / (north - south);
  const canvasWidth = Math.max(620, Math.round(canvasHeight * metricAspect));
  const padding = 26;
  const project = ([longitude, latitude]: number[]) => ({
    x: padding + ((longitude - west) / (east - west)) * (canvasWidth - padding * 2),
    y: padding + ((north - latitude) / (north - south)) * (canvasHeight - padding * 2),
  });
  const buildings = payload.features.map((feature) => {
    const polygons = feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates as number[][][]]
      : feature.geometry.coordinates as number[][][][];
    const path = polygons.map((polygon) => {
      const outerRing = polygon[0] ?? [];
      return outerRing.map((position, index) => {
        const point = project(position);
        return `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      }).join(" ") + " Z";
    }).join(" ");
    const center = project([feature.properties.centerLongitude, feature.properties.centerLatitude]);
    return {
      id: feature.properties.id,
      kind: feature.properties.kind,
      heightM: feature.properties.heightM,
      areaM2: feature.properties.areaM2,
      center: {
        x: center.x,
        y: center.y,
        longitude: feature.properties.centerLongitude,
        latitude: feature.properties.centerLatitude,
      },
      path,
    };
  });
  return { meta: payload.meta, canvas: { width: canvasWidth, height: canvasHeight }, buildings };
}

const kindLabels: Record<BuildingKind, string> = {
  old: "原有建筑",
  new: "新建建筑",
};

const filterLabels: Record<BuildingFilter, string> = {
  all: "全部建筑",
  old: "原有建筑",
  new: "新建建筑",
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function BuildingSurveyExplorer() {
  const [data, setData] = useState<BuildingSurveyData>();
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<BuildingFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [viewBox, setViewBox] = useState<ViewBox>();

  useEffect(() => {
    let active = true;
    fetch("/data/hongtang-buildings-safe.geojson")
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load building survey: ${response.status}`);
        return response.json() as Promise<SafeBuildingFeatureCollection>;
      })
      .then((rawPayload) => {
        const payload = transformSafeGeoJson(rawPayload);
        if (!active) return;
        setData(payload);
        setViewBox({ x: 0, y: 0, width: payload.canvas.width, height: payload.canvas.height });
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const normalizedQuery = query.trim().replace(/^#/, "");
  const visibleBuildings = useMemo(() => {
    if (!data) return [];
    return data.buildings.filter((building) => filter === "all" || building.kind === filter);
  }, [data, filter]);
  const selected = data?.buildings.find((building) => building.id === selectedId);

  const fullView = data
    ? { x: 0, y: 0, width: data.canvas.width, height: data.canvas.height }
    : undefined;

  const resetView = () => {
    if (fullView) setViewBox(fullView);
  };

  const zoom = (factor: number) => {
    if (!fullView) return;
    setViewBox((currentValue) => {
      const current = currentValue ?? fullView;
      const width = clamp(current.width * factor, fullView.width * 0.16, fullView.width);
      const height = clamp(current.height * factor, fullView.height * 0.16, fullView.height);
      const centerX = current.x + current.width / 2;
      const centerY = current.y + current.height / 2;
      return {
        x: clamp(centerX - width / 2, 0, fullView.width - width),
        y: clamp(centerY - height / 2, 0, fullView.height - height),
        width,
        height,
      };
    });
  };

  const focusBuilding = (building: SurveyBuilding) => {
    if (!fullView) return;
    const width = fullView.width * 0.28;
    const height = fullView.height * 0.28;
    setSelectedId(building.id);
    setViewBox({
      x: clamp(building.center.x - width / 2, 0, fullView.width - width),
      y: clamp(building.center.y - height / 2, 0, fullView.height - height),
      width,
      height,
    });
  };

  const locateBuilding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data || !normalizedQuery) return;
    const exact = data.buildings.find((building) => building.id === normalizedQuery);
    const target = exact ?? data.buildings.find((building) => building.id.includes(normalizedQuery));
    if (target) {
      setFilter("all");
      focusBuilding(target);
    }
  };

  const chooseFilter = (nextFilter: BuildingFilter) => {
    setFilter(nextFilter);
    if (selected && nextFilter !== "all" && selected.kind !== nextFilter) setSelectedId(undefined);
  };

  return (
    <section id="building-survey" className="building-survey-section" aria-labelledby="building-survey-title">
      <div className="building-survey-heading">
        <div>
          <span className="building-survey-kicker"><Database size={15} />建筑图层复用</span>
          <h2 id="building-survey-title">建筑调研底图</h2>
          <p>在行动地图之外补充建筑轮廓，帮助规划讨论落到具体空间；原有项目、问题上报和 SDG 关联逻辑保持不变。</p>
        </div>
        <div className="building-privacy-note"><ShieldCheck size={20} /><span><strong>公开字段已筛选</strong>户主、住址、家庭成员和人口信息均未导入。</span></div>
      </div>

      {loadError ? (
        <div className="building-survey-state"><strong>建筑底图暂时无法载入</strong><span>行动地图仍可正常使用，请稍后刷新页面。</span></div>
      ) : !data || !viewBox ? (
        <div className="building-survey-state"><span className="building-survey-spinner" /><strong>正在整理建筑轮廓…</strong></div>
      ) : (
        <div className="building-survey-shell">
          <div className="building-survey-main">
            <div className="building-survey-toolbar">
              <div className="building-filter-tabs" aria-label="建筑类型筛选">
                {(Object.keys(filterLabels) as BuildingFilter[]).map((key) => (
                  <button key={key} type="button" className={filter === key ? "active" : ""} aria-pressed={filter === key} onClick={() => chooseFilter(key)}>{filterLabels[key]}</button>
                ))}
              </div>
              <form className="building-search" onSubmit={locateBuilding}>
                <Search size={16} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} inputMode="numeric" aria-label="输入建筑编号" placeholder="输入建筑编号" />
                <button type="submit">定位</button>
              </form>
            </div>

            <div className="building-survey-canvas">
              <svg viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} role="img" aria-label={`红塘村建筑轮廓底图，当前显示 ${visibleBuildings.length} 栋建筑`}>
                <defs>
                  <pattern id="survey-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#d9e2d8" strokeWidth="1" /></pattern>
                  <filter id="selected-building-shadow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#5d2d20" floodOpacity="0.45" /></filter>
                </defs>
                <rect width={data.canvas.width} height={data.canvas.height} fill="#edf2e9" />
                <rect width={data.canvas.width} height={data.canvas.height} fill="url(#survey-grid)" />
                <g>
                  {visibleBuildings.map((building) => (
                    <path
                      key={building.id}
                      d={building.path}
                      className={`survey-building survey-building-${building.kind} ${selectedId === building.id ? "selected" : ""}`}
                      onClick={() => setSelectedId(building.id)}
                      aria-label={`建筑 ${building.id}，${kindLabels[building.kind]}`}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              </svg>
              <div className="building-map-tools" aria-label="地图缩放工具">
                <button type="button" onClick={() => zoom(0.72)} aria-label="放大建筑底图"><ZoomIn size={18} /></button>
                <button type="button" onClick={() => zoom(1.38)} aria-label="缩小建筑底图"><ZoomOut size={18} /></button>
                <button type="button" onClick={resetView} aria-label="恢复完整建筑底图"><RotateCcw size={17} /></button>
              </div>
              <div className="building-map-legend">
                <span><i className="legend-old" />原有建筑</span>
                <span><i className="legend-new" />新建建筑</span>
                <b>{visibleBuildings.length} / {data.meta.buildingCount} 栋</b>
              </div>
            </div>
          </div>

          <aside className="building-survey-detail" aria-live="polite">
            {selected ? (
              <>
                <span className={`building-kind-badge kind-${selected.kind}`}><Building2 size={15} />{kindLabels[selected.kind]}</span>
                <h3>建筑 #{selected.id}</h3>
                <p>点击其他建筑可切换档案；输入完整编号可自动定位并放大。</p>
                <dl className="building-facts">
                  <div><dt><Ruler size={15} />建筑高度</dt><dd>{selected.heightM.toFixed(1)} 米</dd></div>
                  <div><dt><Building2 size={15} />轮廓占地</dt><dd>约 {selected.areaM2.toFixed(1)} ㎡</dd></div>
                  <div><dt><MapPin size={15} />中心坐标</dt><dd>{selected.center.longitude.toFixed(5)}, {selected.center.latitude.toFixed(5)}</dd></div>
                </dl>
                <button className="button button-secondary building-focus-button" type="button" onClick={() => focusBuilding(selected)}><Search size={16} />定位到这栋建筑</button>
              </>
            ) : (
              <div className="building-detail-empty"><MapPin size={30} /><strong>选择一栋建筑</strong><p>点击轮廓后，这里会显示建筑类型、高度、占地和位置。</p></div>
            )}
            <div className="building-source-note"><Database size={16} /><span><strong>资料说明</strong>三农数据 GeoServer 建筑图层，源数据生成于 {data.meta.sourceGeneratedAt ?? "未标注"}；公开文件已经脱敏，轮廓占地由几何数据估算。</span></div>
            <div className="building-summary-grid">
              <div><strong>{data.meta.stats.oldCount}</strong><span>原有建筑</span></div>
              <div><strong>{data.meta.stats.newCount}</strong><span>新建建筑</span></div>
              <div><strong>{data.meta.stats.averageHeightM}m</strong><span>平均高度</span></div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
