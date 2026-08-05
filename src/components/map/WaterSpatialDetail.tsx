"use client";

import { CalendarDays, Droplets, MapPin, Mountain, Route, X } from "lucide-react";
import {
  WaterSpatialSelection,
  WaterSystemData,
  waterLineStyles,
  waterNodeLabels,
} from "@/lib/spatialData";

export function WaterSpatialDetail({
  selection,
  data,
  onClose,
  variant = "map",
}: {
  selection: WaterSpatialSelection;
  data: WaterSystemData;
  onClose: () => void;
  variant?: "map" | "gaussian";
}) {
  const { item } = selection;
  const typeLabel = selection.type === "node"
    ? waterNodeLabels[selection.item.kind]
    : selection.type === "line"
      ? waterLineStyles[selection.item.kind].label
      : "供水分区";
  const supplyNode = selection.type === "zone"
    ? data.nodes.find((node) => node.id === selection.item.supplyNodeId)
    : undefined;
  const servedZones = selection.type === "node"
    ? data.zones.filter((zone) => zone.supplyNodeId === selection.item.id)
    : [];

  return (
    <aside className="map-detail water-spatial-detail" data-detail-variant={variant}>
      <button className="icon-button map-detail-close" onClick={onClose} aria-label="关闭矢量详情"><X size={18} /></button>
      <div className="water-spatial-hero"><Droplets size={30} /><span>村里用水专题</span></div>
      <div className="inline-badges">
        <span className="soft-tag marker-water-facility">{typeLabel}</span>
        <span className="demo-badge">示例矢量</span>
      </div>
      <h2>{item.title}</h2>
      <p>{item.description}</p>
      <div className="detail-facts">
        <span><MapPin size={16} /><b>位置</b>{item.location}</span>
        {selection.type === "node" && selection.item.elevation != null ? (
          <span><Mountain size={16} /><b>高程</b>{selection.item.elevation.toFixed(1)}米</span>
        ) : null}
        {selection.type === "line" ? (
          <span><Route size={16} /><b>落差</b>{selection.item.dropMeters.toFixed(1)}米</span>
        ) : null}
        <span><CalendarDays size={16} /><b>更新</b>{data.updatedAt}</span>
      </div>
      {supplyNode ? (
        <section className="water-relation-card">
          <small>该片区供水来源</small>
          <strong>{supplyNode.title}</strong>
          <p>{supplyNode.description}</p>
        </section>
      ) : null}
      {servedZones.length ? (
        <section className="water-relation-card">
          <small>服务片区</small>
          <strong>{servedZones.map((zone) => zone.title).join("、")}</strong>
          <p>点击对应片区可继续查看范围和来源说明。</p>
        </section>
      ) : null}
      <div className="water-spatial-note"><strong>当前数据边界</strong><p>{data.notice}</p></div>
    </aside>
  );
}
