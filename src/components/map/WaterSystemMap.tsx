"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Image as ImageIcon, Layers3, MapPin, Mountain, Route, Waves } from "lucide-react";
import { geographicBasemaps, VillageBasemap } from "@/components/map/VillageMap";
import { useMapZoom } from "@/components/map/useMapZoom";

export type WaterNodeKind = "source" | "storage" | "supply" | "treatment";
export type WaterLineKind = "main-drain" | "outlet" | "branch-drain";

export interface WaterSystemNode {
  id: string;
  kind: WaterNodeKind;
  title: string;
  longitude: number;
  latitude: number;
  elevation: number | null;
  location: string;
  description: string;
  status: string;
}

export interface WaterSystemLine {
  id: string;
  kind: WaterLineKind;
  title: string;
  path: [number, number][];
  dropMeters: number;
  location: string;
  description: string;
  status: string;
}

export interface WaterSystemZone {
  id: string;
  kind: "supply-zone";
  title: string;
  polygon: [number, number][];
  supplyNodeId: string;
  location: string;
  description: string;
  status: string;
}

interface WaterSystemData {
  title: string;
  notice: string;
  updatedAt: string;
  terrainBasis: string;
  nodes: WaterSystemNode[];
  lines: WaterSystemLine[];
  zones: WaterSystemZone[];
}

type Selection =
  | { type: "node"; item: WaterSystemNode }
  | { type: "line"; item: WaterSystemLine }
  | { type: "zone"; item: WaterSystemZone };

const nodeStyles: Record<WaterNodeKind, { color: string; label: string }> = {
  source: { color: "#1d4e89", label: "水源" },
  storage: { color: "#2f7fa8", label: "水塘调蓄" },
  supply: { color: "#3d7651", label: "集中供水点" },
  treatment: { color: "#7a5c3a", label: "污水处理" },
};

const lineStyles: Record<WaterLineKind, { color: string; width: number; dash?: string; label: string }> = {
  "main-drain": { color: "#2f7fa8", width: 2.6, label: "主排水沟" },
  outlet: { color: "#1d4e89", width: 3, label: "出流沟" },
  "branch-drain": { color: "#6ba6c4", width: 1.8, dash: "7 5", label: "支沟" },
};

export function WaterSystemMap() {
  const [basemap, setBasemap] = useState<VillageBasemap>("handdrawn");
  const [data, setData] = useState<WaterSystemData>();
  const [selection, setSelection] = useState<Selection>();
  const [showZones, setShowZones] = useState(true);
  const { containerRef, frameRef, frameStyle, zoomed, scale, reset, panHandlers } = useMapZoom();

  useEffect(() => {
    reset();
  }, [basemap, reset]);

  useEffect(() => {
    let active = true;
    fetch("/data/hongtang-water-system.json")
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load water system data: ${response.status}`);
        return response.json() as Promise<WaterSystemData>;
      })
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setSelection({ type: "node", item: payload.nodes.find((n) => n.kind === "storage") ?? payload.nodes[0] });
      })
      .catch(() => {
        if (!active) return;
        setData(undefined);
      });
    return () => {
      active = false;
    };
  }, []);

  const geographic = geographicBasemaps[basemap];
  const project = useMemo(() => {
    const { bounds, width, height } = geographic;
    return (longitude: number, latitude: number): [number, number] => [
      ((longitude - bounds.west) / (bounds.east - bounds.west)) * width,
      ((bounds.north - latitude) / (bounds.north - bounds.south)) * height,
    ];
  }, [geographic]);

  const selectedTitle = selection?.item.title;

  return (
    <div className="water-system">
      <div className="water-system-canvas">
        <div
          className={`map-geographic-stage ${zoomed ? "zoomed" : ""}`}
          ref={containerRef}
          {...panHandlers}
        >
          <div
            className="map-geographic-frame"
            ref={frameRef}
            style={{ aspectRatio: `${geographic.width} / ${geographic.height}`, ...frameStyle }}
          >
            <Image src={geographic.src} alt={geographic.alt} width={geographic.width} height={geographic.height} unoptimized />
          {data ? (
            <svg
              className="water-system-svg"
              viewBox={`0 0 ${geographic.width} ${geographic.height}`}
              preserveAspectRatio="none"
              aria-label="水文与排水系统图层"
            >
              {showZones
                ? data.zones.map((zone) => (
                    <polygon
                      key={zone.id}
                      className={`water-zone ${selectedTitle === zone.title ? "active" : ""}`}
                      points={zone.polygon.map(([lng, lat]) => project(lng, lat).join(",")).join(" ")}
                      onClick={() => setSelection({ type: "zone", item: zone })}
                    >
                      <title>{zone.title}</title>
                    </polygon>
                  ))
                : null}
              {data.lines.map((line) => {
                const style = lineStyles[line.kind];
                return (
                  <polyline
                    key={line.id}
                    className={`water-line ${selectedTitle === line.title ? "active" : ""}`}
                    points={line.path.map(([lng, lat]) => project(lng, lat).join(",")).join(" ")}
                    stroke={style.color}
                    strokeWidth={style.width}
                    strokeDasharray={style.dash}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    onClick={() => setSelection({ type: "line", item: line })}
                  >
                    <title>{line.title}</title>
                  </polyline>
                );
              })}
              {data.nodes.map((node) => {
                const [x, y] = project(node.longitude, node.latitude);
                const style = nodeStyles[node.kind];
                const active = selectedTitle === node.title;
                return (
                  <g key={node.id} className={`water-node ${active ? "active" : ""}`} onClick={() => setSelection({ type: "node", item: node })}>
                    <circle className="water-node-hit" cx={x} cy={y} r={26} />
                    <circle cx={x} cy={y} r={active ? 11 : 8} fill={style.color} stroke="#fff" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
                    <text x={x} y={y - 16} textAnchor="middle" className="water-node-label">
                      {node.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : null}
        </div>
        {zoomed ? (
          <button type="button" className="map-zoom-reset" onClick={reset}>复位视图 · {scale.toFixed(1)}×</button>
        ) : (
          <span className="map-zoom-hint">滚轮缩放 · 双击复位</span>
        )}
        </div>
        <div className="map-basemap-control" aria-label="切换水文地图底图">
          <button className={basemap === "handdrawn" ? "active" : ""} onClick={() => setBasemap("handdrawn")} aria-pressed={basemap === "handdrawn"}><Layers3 size={16} />手绘图</button>
          <button className={basemap === "aerial" ? "active" : ""} onClick={() => setBasemap("aerial")} aria-pressed={basemap === "aerial"}><ImageIcon size={16} />无人机影像</button>
        </div>
        <div className="water-system-legend" aria-label="图例">
          <button className={`water-legend-toggle ${showZones ? "on" : ""}`} onClick={() => setShowZones((v) => !v)} aria-pressed={showZones}>
            <i className="water-legend-zone" />给水分片
          </button>
          {Object.entries(lineStyles).map(([kind, style]) => (
            <span key={kind}><i style={{ background: style.color }} />{style.label}</span>
          ))}
          {Object.entries(nodeStyles).map(([kind, style]) => (
            <span key={kind}><b style={{ background: style.color }} />{style.label}</span>
          ))}
        </div>
      </div>

      <aside className="water-system-detail" aria-live="polite">
        <div className="matter-topic-map-detail-heading"><Waves size={20} /><span><small>水文与排水系统</small><strong>{data ? `${data.lines.length}条沟道 · ${data.nodes.length}个节点 · ${data.zones.length}个供水分片` : "正在读取……"}</strong></span></div>
        {selection ? (
          <div className="water-system-selected">
            <div className="inline-badges">
              <span className="soft-tag marker-water-facility">
                {selection.type === "node" ? nodeStyles[(selection.item as WaterSystemNode).kind].label
                  : selection.type === "line" ? lineStyles[(selection.item as WaterSystemLine).kind].label
                  : "供水分区"}
              </span>
              <span className="status-badge">{selection.item.status}</span>
            </div>
            <h3>{selection.item.title}</h3>
            <p>{selection.item.description}</p>
            <div className="matter-topic-facts">
              <span><MapPin size={16} /><b>位置</b>{selection.item.location}</span>
              {selection.type === "node" && (selection.item as WaterSystemNode).elevation != null ? (
                <span><Mountain size={16} /><b>高程</b>{(selection.item as WaterSystemNode).elevation?.toFixed(1)} 米</span>
              ) : null}
              {selection.type === "line" ? (
                <span><Route size={16} /><b>落差</b>{(selection.item as WaterSystemLine).dropMeters.toFixed(1)} 米</span>
              ) : null}
              {data ? <span><CalendarDays size={16} /><b>更新</b>{data.updatedAt}</span> : null}
            </div>
          </div>
        ) : <p className="matter-topic-empty">正在读取水文资料……</p>}
        {data ? <div className="water-system-note"><strong>地形依据</strong><p>{data.terrainBasis}</p><small>{data.notice}</small></div> : null}
      </aside>
    </div>
  );
}
