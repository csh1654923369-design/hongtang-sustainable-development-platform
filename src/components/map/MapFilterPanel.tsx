"use client";

import { ChevronRight, Layers3, RotateCcw, X } from "lucide-react";
import { MapFeatureType } from "@/types";
import { mapFeatureLabels } from "@/lib/utils";

export interface MapFilters {
  types: MapFeatureType[];
}

export const verifiedMapFeatureTypes = [
  MapFeatureType.Garden,
  MapFeatureType.TeaFactory,
  MapFeatureType.WaterFacility,
  MapFeatureType.PublicService,
  MapFeatureType.Ecology,
  MapFeatureType.ResearchPhoto,
] as const;

export const initialMapFilters: MapFilters = { types: [...verifiedMapFeatureTypes] };

export type MapFilterGroup = "garden" | "tea" | "water" | "public" | "ecology" | "research";

export function mapFeatureTypeToFilterGroup(type: MapFeatureType): MapFilterGroup {
  if (type === MapFeatureType.Garden) return "garden";
  if (type === MapFeatureType.TeaGarden || type === MapFeatureType.TeaFactory) return "tea";
  if (type === MapFeatureType.WaterFacility || type === MapFeatureType.Water) return "water";
  if (type === MapFeatureType.PublicService || type === MapFeatureType.SafetyRisk || type === MapFeatureType.SolarFacility) return "public";
  if (type === MapFeatureType.ResearchPhoto) return "research";
  return "ecology";
}

export function MapFilterPanel({ filters, availableTypes, counts, onChange, onReset, onClose, onOpenWaterTopic }: { filters: MapFilters; availableTypes: MapFeatureType[]; counts: Partial<Record<MapFeatureType, number>>; onChange: (next: MapFilters) => void; onReset: () => void; onClose?: () => void; onOpenWaterTopic?: () => void }) {
  const toggleType = (type: MapFeatureType) => onChange({
    ...filters,
    types: filters.types.includes(type)
      ? filters.types.filter((item) => item !== type)
      : [...filters.types, type],
  });

  return (
    <aside className="map-filter-panel">
      <div className="filter-heading">
        <span><Layers3 size={18} />专题</span>
        <span className="filter-heading-actions">
          <button onClick={onReset}><RotateCcw size={15} />全部显示</button>
          {onClose ? <button onClick={onClose} aria-label="关闭专题"><X size={16} />完成</button> : null}
        </span>
      </div>
      <div className="filter-group">
        <div className="layer-list">
          {availableTypes.map((type) => {
            const waterTopicRow = type === MapFeatureType.WaterFacility && onOpenWaterTopic;
            return (
              <div className={`layer-list-row${waterTopicRow ? " has-topic-action" : ""}`} key={type}>
                <label>
                  <input data-layer-type={type} type="checkbox" checked={filters.types.includes(type)} onChange={() => toggleType(type)} />
                  <span className={`layer-dot marker-${type}`} />
                  <span>{mapFeatureLabels[type]}</span>
                  <small>{counts[type] ?? 0}</small>
                </label>
                {waterTopicRow ? (
                  <button type="button" className="layer-topic-open" onClick={onOpenWaterTopic} aria-label="进入村里用水专题">
                    进入<ChevronRight size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
