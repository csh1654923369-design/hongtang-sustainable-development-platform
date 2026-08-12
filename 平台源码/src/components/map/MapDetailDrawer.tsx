"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, MapPin, X } from "lucide-react";
import { SpatialFeature } from "@/types";
import { mapFeatureLabels } from "@/lib/utils";
import type { FieldworkTopicRecord } from "@/lib/spatialData";

type MapDetailDrawerProps = {
  feature?: SpatialFeature;
  onClose: () => void;
  variant?: "map" | "gaussian";
  records?: FieldworkTopicRecord[];
};

export function MapDetailDrawer({ feature, onClose, variant = "map", records = [] }: MapDetailDrawerProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const [failedImageUrl, setFailedImageUrl] = useState<string>();

  if (!feature) {
    return (
      <aside className="map-detail empty-detail" data-detail-variant={variant}>
        <MapPin size={28} />
        <strong>选择一个地图点位</strong>
        <p>点击地图标记后，这里会显示已经录入的位置、照片和说明。</p>
      </aside>
    );
  }

  const images = feature.imageUrls ?? [];
  const currentIndex = images.length ? imageIndex % images.length : 0;
  const currentImage = images[currentIndex];
  const imageFailed = Boolean(currentImage && failedImageUrl === currentImage);
  const moveImage = (direction: number) => {
    setFailedImageUrl(undefined);
    setImageIndex((current) => (current + direction + images.length) % images.length);
  };

  return (
    <aside className="map-detail" data-detail-variant={variant}>
      <button className="icon-button map-detail-close" onClick={onClose} aria-label="关闭点位详情"><X size={18} /></button>
      <div className={`detail-image marker-${feature.featureType} ${currentImage && !imageFailed ? "has-photo" : ""}`}>
        {currentImage && !imageFailed
          ? <img src={currentImage} alt={`${feature.title}现场照片 ${currentIndex + 1}`} onError={() => setFailedImageUrl(currentImage)} />
          : <span>{imageFailed ? "照片暂时无法载入" : feature.imageLabel}</span>}
        {images.length > 1 ? (
          <div className="detail-image-navigation">
            <button type="button" onClick={() => moveImage(-1)} aria-label="上一张照片"><ChevronLeft size={18} /></button>
            <span>{currentIndex + 1} / {images.length}</span>
            <button type="button" onClick={() => moveImage(1)} aria-label="下一张照片"><ChevronRight size={18} /></button>
          </div>
        ) : null}
      </div>
      <div className="inline-badges">
        <span className="soft-tag">{mapFeatureLabels[feature.featureType]}</span>
        <span className="status-badge">{feature.status}</span>
      </div>
      <h2>{feature.title}</h2>
      <p>{feature.description}</p>
      <div className="detail-facts">
        <span><MapPin size={16} /><b>位置</b>{feature.location}</span>
        <span><CalendarDays size={16} /><b>更新</b>{feature.updatedAt}</span>
      </div>
      {records.length ? (
        <section className="detail-topic-records" aria-label="专题调研记录">
          <div className="detail-topic-heading"><ClipboardList size={17} /><strong>专题调研记录</strong><span>示例数据</span></div>
          {records.map((record) => (
            <article key={record.id}>
              <div><strong>{record.recordTitle}</strong><time>{record.surveyDate}</time></div>
              <dl>
                {record.displayFields.filter((field) => field.value).map((field) => (
                  <div key={field.key}><dt>{field.label}</dt><dd>{field.value}{field.unit ? ` ${field.unit}` : ""}</dd></div>
                ))}
              </dl>
              {record.notes ? <p>{record.notes}</p> : null}
            </article>
          ))}
        </section>
      ) : null}
      <div className="detail-coordinates">坐标：{feature.longitude.toFixed(6)}, {feature.latitude.toFixed(6)}</div>
    </aside>
  );
}
