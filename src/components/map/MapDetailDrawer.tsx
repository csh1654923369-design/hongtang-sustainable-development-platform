"use client";

import Link from "next/link";
import { BellPlus, CalendarDays, ChevronRight, MapPin, X } from "lucide-react";
import { SpatialFeature, MapFeatureType } from "@/types";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { mapFeatureLabels } from "@/lib/utils";
import { projectService } from "@/services/projects";
import { useDemo } from "@/components/providers/DemoProvider";

export function MapDetailDrawer({ feature, onClose }: { feature?: SpatialFeature; onClose: () => void }) {
  const { notify } = useDemo();
  if (!feature) return <aside className="map-detail empty-detail"><MapPin size={28} /><strong>选择一个地图点位</strong><p>点击地图标记后，这里会显示类型、状态、位置和关联内容。</p><DemoDataBadge /></aside>;
  const project = feature.featureType === MapFeatureType.Project && feature.linkedId ? projectService.getBySlug(feature.linkedId) : undefined;
  const href = feature.featureType === MapFeatureType.Issue || feature.featureType === MapFeatureType.CompletedAction ? `/issues/${feature.linkedId}` : project ? `/projects/${project.slug}` : undefined;
  return (
    <aside className="map-detail">
      <button className="icon-button map-detail-close" onClick={onClose} aria-label="关闭点位详情"><X size={18} /></button>
      <div className={`detail-image marker-${feature.featureType}`}><span>{feature.imageLabel}</span><DemoDataBadge /></div>
      <div className="inline-badges"><span className="soft-tag">{mapFeatureLabels[feature.featureType]}</span><span className="status-badge">{feature.status}</span></div>
      <h2>{feature.title}</h2><p>{feature.description}</p>
      <div className="detail-facts"><span><MapPin size={16} /><b>位置</b>{feature.location}</span><span><CalendarDays size={16} /><b>更新</b>{feature.updatedAt}</span></div>
      <div className="detail-coordinates">坐标：{feature.longitude.toFixed(4)}, {feature.latitude.toFixed(4)} · 演示坐标</div>
      <div className="detail-actions"><button className="button button-secondary" onClick={() => notify("已关注该点位", "后续模拟更新会显示在通知中。", "success")}><BellPlus size={17} />关注点位</button>{href ? <Link className="button button-primary" href={href}>查看详情 <ChevronRight size={17} /></Link> : null}</div>
    </aside>
  );
}
