"use client";

import { ChevronRight, Droplets, Factory, Flower2, History, Layers3, RotateCcw, TriangleAlert, X } from "lucide-react";
import { MapFeatureType } from "@/types";
import { mapFeatureLabels } from "@/lib/utils";
import { countTopicFeatures, supportingLayerTypes, villageTopics, type VillageTopicId } from "@/lib/villageTopics";

export interface MapFilters {
  types: MapFeatureType[];
}

export const verifiedMapFeatureTypes = [
  MapFeatureType.Garden,
  MapFeatureType.TeaGarden,
  MapFeatureType.TeaFactory,
  MapFeatureType.WaterFacility,
  MapFeatureType.SafetyRisk,
  MapFeatureType.VillageMemory,
  MapFeatureType.Culture,
  MapFeatureType.PublicService,
  MapFeatureType.ResearchPhoto,
] as const;

export function createInitialMapFilters(): MapFilters {
  return { types: [...verifiedMapFeatureTypes] };
}

export const initialMapFilters: MapFilters = createInitialMapFilters();

export type MapFilterGroup = "garden" | "tea" | "water" | "safety" | "history" | "public" | "ecology" | "research";

export function mapFeatureTypeToFilterGroup(type: MapFeatureType): MapFilterGroup {
  if (type === MapFeatureType.Garden) return "garden";
  if (type === MapFeatureType.TeaGarden || type === MapFeatureType.TeaFactory) return "tea";
  if (type === MapFeatureType.WaterFacility || type === MapFeatureType.Water) return "water";
  if (type === MapFeatureType.SafetyRisk) return "safety";
  if (type === MapFeatureType.VillageMemory || type === MapFeatureType.Culture) return "history";
  if (type === MapFeatureType.PublicService) return "public";
  if (type === MapFeatureType.ResearchPhoto) return "research";
  return "ecology";
}

const topicIcons = {
  garden: Flower2,
  tea: Factory,
  water: Droplets,
  safety: TriangleAlert,
  history: History,
} as const;

export function MapFilterPanel({ filters, availableTypes, counts, onChange, onReset, onClose, onOpenTopic, showHeading = true }: { filters: MapFilters; availableTypes: MapFeatureType[]; counts: Partial<Record<MapFeatureType, number>>; onChange: (next: MapFilters) => void; onReset: () => void; onClose?: () => void; onOpenTopic?: (topicId: VillageTopicId) => void; showHeading?: boolean }) {
  const toggleType = (type: MapFeatureType) => onChange({
    ...filters,
    types: filters.types.includes(type)
      ? filters.types.filter((item) => item !== type)
      : [...filters.types, type],
  });
  const toggleTopic = (topicId: VillageTopicId) => {
    const topic = villageTopics.find((item) => item.id === topicId);
    if (!topic) return;
    const allSelected = topic.featureTypes.every((type) => filters.types.includes(type));
    onChange({
      ...filters,
      types: allSelected
        ? filters.types.filter((type) => !topic.featureTypes.includes(type))
        : Array.from(new Set([...filters.types, ...topic.featureTypes])),
    });
  };
  const baseLayers = supportingLayerTypes.filter((type) => availableTypes.includes(type) && (counts[type] ?? 0) > 0);

  return (
    <aside className="map-filter-panel">
      {showHeading ? (
        <div className="filter-heading">
          <span><Layers3 size={18} />专题</span>
          <span className="filter-heading-actions">
            <button className="filter-action-button" onClick={onReset}><RotateCcw size={15} />全选</button>
            {onClose ? <button className="filter-action-button" onClick={onClose} aria-label="关闭专题"><X size={16} />完成</button> : null}
          </span>
        </div>
      ) : null}
      <div className="filter-group">
        {!showHeading ? <p className="topic-question-intro">你想先弄清楚村里的哪件事？</p> : null}
        <div className="layer-list topic-layer-list">
          {villageTopics.map((topic) => {
            const TopicIcon = topicIcons[topic.id];
            const count = countTopicFeatures(topic, counts);
            const selected = topic.featureTypes.some((type) => filters.types.includes(type));
            return (
              <div className="layer-list-row has-topic-action village-topic-row" data-topic-id={topic.id} key={topic.id}>
                <label>
                  <input data-topic-filter={topic.id} type="checkbox" checked={selected} onChange={() => toggleTopic(topic.id)} />
                  <span className={`topic-layer-icon topic-${topic.id}`}><TopicIcon size={15} aria-hidden="true" /></span>
                  <span className="topic-layer-copy"><b>{topic.title}</b><small>{topic.shortDescription}</small></span>
                  <small className={count ? "" : "is-empty"}>{count ? `${count}项` : "待调查"}</small>
                </label>
                {onOpenTopic ? (
                  <button type="button" className="layer-topic-open" onClick={() => onOpenTopic(topic.id)} aria-label={`进入${topic.title}专题`}>
                    进入<ChevronRight size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        {baseLayers.length ? (
          <>
            <strong className="filter-group-title supporting-layer-title">其他资料</strong>
            <div className="layer-list supporting-layer-list">
              {baseLayers.map((type) => (
                <div className="layer-list-row" key={type}>
                  <label>
                    <input data-layer-type={type} type="checkbox" checked={filters.types.includes(type)} onChange={() => toggleType(type)} />
                    <span className={`layer-dot marker-${type}`} />
                    <span>{mapFeatureLabels[type]}</span>
                    <small>{counts[type] ?? 0}</small>
                  </label>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}
