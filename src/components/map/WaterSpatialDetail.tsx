"use client";

import { ArrowRight, CalendarDays, CircleHelp, Droplets, MapPin, Mountain, Route, Users, Wrench, X } from "lucide-react";
import {
  findWaterSelection,
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
  onSelectRelated,
}: {
  selection: WaterSpatialSelection;
  data: WaterSystemData;
  onClose: () => void;
  variant?: "map" | "gaussian";
  onSelectRelated?: (id: string) => void;
}) {
  const { item } = selection;
  const typeLabel = selection.type === "node"
    ? waterNodeLabels[selection.item.kind]
    : selection.type === "line"
      ? waterLineStyles[selection.item.kind].label
      : "供水分区";
  const relationGroups = selection.type === "node"
    ? [
        { label: "从哪里来", ids: selection.item.upstreamIds ?? [] },
        { label: selection.item.system === "drainage" ? "流向哪里" : "接着到哪里", ids: selection.item.downstreamIds ?? [] },
        { label: "服务哪些片区", ids: selection.item.servedZoneIds ?? [] },
      ]
    : selection.type === "line"
      ? [
          { label: "起点", ids: selection.item.fromNodeId ? [selection.item.fromNodeId] : [] },
          { label: "终点", ids: selection.item.toNodeId ? [selection.item.toNodeId] : [] },
          { label: "服务哪些片区", ids: selection.item.servedZoneIds ?? [] },
        ]
      : [
          { label: "供水来源", ids: selection.item.sourceNodeIds ?? [] },
          { label: "经过线路", ids: selection.item.routeLineIds ?? [] },
          { label: "进入片区", ids: [selection.item.supplyNodeId] },
        ];
  const functions = selection.type === "node" ? selection.item.functions ?? [] : [];
  const servedUses = selection.type === "zone" ? selection.item.servedUses ?? [] : [];
  const maintenance = selection.item.maintenance;
  const openQuestions = selection.item.openQuestions ?? [];

  return (
    <aside className="map-detail water-spatial-detail" data-detail-variant={variant}>
      <button className="icon-button map-detail-close" onClick={onClose} aria-label="关闭矢量详情"><X size={18} /></button>
      <div className="water-spatial-hero"><Droplets size={30} /><span>村里用水专题</span></div>
      <div className="inline-badges">
        <span className="soft-tag marker-water-facility">{typeLabel}</span>
        <span className="status-badge">待实地核实</span>
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
      <section className="water-flow-reading" aria-label="水系统关系">
        <div className="water-flow-heading"><Route size={17} /><strong>顺着水继续看</strong></div>
        {relationGroups.filter((group) => group.ids.length).map((group) => (
          <div className="water-flow-group" key={group.label}>
            <small>{group.label}</small>
            <div>
              {group.ids.map((id, index) => {
                const related = findWaterSelection(data, id);
                if (!related) return null;
                return (
                  <span key={id}>
                    <button type="button" onClick={() => onSelectRelated?.(id)} disabled={!onSelectRelated}>{related.item.title}</button>
                    {index < group.ids.length - 1 ? <ArrowRight size={13} aria-hidden="true" /> : null}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        {selection.type === "line" && selection.item.flowDescription ? <p>{selection.item.flowDescription}</p> : null}
      </section>
      {functions.length || servedUses.length ? (
        <section className="water-use-card">
          <div><Users size={17} /><strong>{servedUses.length ? "这个片区怎样用水" : "这个节点有什么作用"}</strong></div>
          <ul>{[...functions, ...servedUses].map((text) => <li key={text}>{text}</li>)}</ul>
        </section>
      ) : null}
      {maintenance ? (
        <section className="water-governance-card"><div><Wrench size={17} /><strong>共同建设与维护</strong></div><p>{maintenance}</p></section>
      ) : null}
      {openQuestions.length ? (
        <section className="water-questions-card"><div><CircleHelp size={17} /><strong>还需要向村民了解</strong></div><ul>{openQuestions.map((question) => <li key={question}>{question}</li>)}</ul></section>
      ) : null}
      <div className="water-spatial-note"><strong>当前数据边界</strong><p>{data.notice}</p></div>
    </aside>
  );
}
