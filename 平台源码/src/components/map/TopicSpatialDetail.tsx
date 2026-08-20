"use client";

import { CalendarDays, Layers3, MapPin, X } from "lucide-react";
import type { TopicSpatialSelection } from "@/lib/topicSpatialData";
import { topicFeatureCenter, topicGeometryLabel } from "@/lib/topicSpatialData";
import { villageTopicById } from "@/lib/villageTopics";

export function TopicSpatialDetail({ selection, onClose }: { selection: TopicSpatialSelection; onClose: () => void }) {
  const { item, layer } = selection;
  const center = topicFeatureCenter(item);
  return (
    <aside className="map-detail topic-spatial-detail">
      <button className="icon-button map-detail-close" onClick={onClose} aria-label="关闭专题要素详情"><X size={18} /></button>
      <div className="topic-spatial-detail-hero" style={{ "--topic-detail-color": layer.color } as React.CSSProperties}>
        <Layers3 size={28} /><span>{villageTopicById[item.topicId].title}</span>
      </div>
      <div className="inline-badges"><span className="soft-tag">{layer.title}</span><span className="status-badge">{item.status}</span></div>
      <h2>{item.title}</h2>
      <p>{item.description}</p>
      <div className="detail-facts">
        <span><MapPin size={16} /><b>位置</b>{item.location}</span>
        <span><CalendarDays size={16} /><b>更新</b>{item.updatedAt}</span>
      </div>
      <section className="detail-topic-records" aria-label="专题属性">
        <div className="detail-topic-heading"><Layers3 size={17} /><strong>{topicGeometryLabel(layer.geometryType)}属性</strong><span>试验数据</span></div>
        <article><dl>{layer.fields.map((field) => {
          const value = item.properties[field.key];
          if (value === undefined || value === null || value === "") return null;
          return <div key={field.key}><dt>{field.label}</dt><dd>{String(value)}{field.unit ? ` ${field.unit}` : ""}</dd></div>;
        })}</dl></article>
      </section>
      <div className="detail-coordinates">中心坐标：{center[0].toFixed(6)}, {center[1].toFixed(6)}</div>
    </aside>
  );
}
