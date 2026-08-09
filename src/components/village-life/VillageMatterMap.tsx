"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowDown, CalendarDays, Image as ImageIcon, Layers3, MapPin, MapPinned } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { VillageBasemap, VillageMap } from "@/components/map/VillageMap";
import { fetchPlatformDataset } from "@/lib/platformData";
import { mapFeatureLabels } from "@/lib/utils";
import { SpatialFeature } from "@/types";

interface VillageMatterMapProps {
  topicId: string;
  eyebrow: string;
  title: string;
  description: string;
  visibleLabel: string;
  features: SpatialFeature[];
}

export function VillageMatterMap({ topicId, eyebrow, title, description, visibleLabel, features }: VillageMatterMapProps) {
  const [basemap, setBasemap] = useState<VillageBasemap>("handdrawn");
  const [selected, setSelected] = useState<SpatialFeature | undefined>(features[0]);
  const [realTopicFeatures, setRealTopicFeatures] = useState<SpatialFeature[]>();
  const featureTypes = useMemo(() => new Set(features.map((feature) => feature.featureType)), [features]);
  useEffect(() => {
    let active = true;
    fetchPlatformDataset<{ features: SpatialFeature[] }>(
      "hongtang-real-map-features",
      "/data/hongtang-real-map-features.json",
    )
      .then((payload) => {
        if (!active) return;
        const matching = payload.features.filter((feature) => featureTypes.has(feature.featureType));
        setRealTopicFeatures(matching);
        if (matching.length) setSelected(matching[0]);
      })
      .catch(() => {
        if (active) setRealTopicFeatures([]);
      });
    return () => {
      active = false;
    };
  }, [featureTypes]);
  const displayFeatures = realTopicFeatures?.length ? realTopicFeatures : features;

  return (
    <section className="matter-topic-map" data-topic-map={topicId} data-topic-map-count={displayFeatures.length}>
      <div className="matter-topic-map-canvas">
        <VillageMap features={displayFeatures} selectedId={selected?.id} onSelect={setSelected} basemap={basemap} />
        <span className="matter-topic-visible"><i />当前只显示：{visibleLabel} · {displayFeatures.length} 个点位{realTopicFeatures?.length ? "" : "（演示）"}</span>
        <div className="map-basemap-control matter-basemap-control" aria-label="切换事项地图底图">
          <button className={basemap === "handdrawn" ? "active" : ""} onClick={() => setBasemap("handdrawn")} aria-pressed={basemap === "handdrawn"}><Layers3 size={16} />手绘图</button>
          <button className={basemap === "aerial" ? "active" : ""} onClick={() => setBasemap("aerial")} aria-pressed={basemap === "aerial"}><ImageIcon size={16} />无人机影像</button>
        </div>
      </div>
      <aside className="matter-topic-map-detail" aria-live="polite">
        <div className="matter-topic-map-title">
          <span className="matter-page-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="matter-topic-map-detail-heading"><MapPinned size={20} /><span><small>地图中的{title}</small><strong>{visibleLabel}</strong></span></div>
        {selected ? (
          <div className="matter-topic-selected" data-topic-selected-title={selected.title}>
            {selected.imageUrls?.[0] ? <img className="matter-topic-photo" src={selected.imageUrls[0]} alt={`${selected.title}现场照片`} /> : null}
            <div className="inline-badges"><span className={`soft-tag marker-${selected.featureType}`}>{mapFeatureLabels[selected.featureType]}</span><span className="status-badge">{selected.status}</span></div>
            <h2>{selected.title}</h2>
            <p>{selected.description}</p>
            <div className="matter-topic-facts">
              <span><MapPin size={16} /><b>位置</b>{selected.location}</span>
              <span><CalendarDays size={16} /><b>更新</b>{selected.updatedAt}</span>
            </div>
            <div className={`matter-topic-map-note ${selected.isDemo ? "" : "real-note"}`}>{selected.isDemo ? "当前板块尚无对应素材，暂保留演示点位。" : `坐标：${selected.longitude.toFixed(6)}, ${selected.latitude.toFixed(6)}${selected.imageUrls?.length ? ` · 共${selected.imageUrls.length}张现场照片` : ""}`}</div>
          </div>
        ) : <p className="matter-topic-empty">当前还没有这一事项的点位资料。</p>}
        <div className="matter-topic-map-actions">
          <a className="button button-primary" href="#matter-functions">继续看本板块功能 <ArrowDown size={17} /></a>
          <Link className="button button-secondary" href="/map">打开全部村庄地图</Link>
        </div>
      </aside>
    </section>
  );
}
