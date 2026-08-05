"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
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

export function MapFilterPanel({ filters, availableTypes, counts, onChange, onReset }: { filters: MapFilters; availableTypes: MapFeatureType[]; counts: Partial<Record<MapFeatureType, number>>; onChange: (next: MapFilters) => void; onReset: () => void }) {
  const toggleType = (type: MapFeatureType) => onChange({
    ...filters,
    types: filters.types.includes(type)
      ? filters.types.filter((item) => item !== type)
      : [...filters.types, type],
  });

  return (
    <aside className="map-filter-panel">
      <div className="filter-heading">
        <span><SlidersHorizontal size={18} />筛选地点</span>
        <button onClick={onReset}><RotateCcw size={15} />全选</button>
      </div>
      <div className="filter-group">
        <div className="layer-list">
          {availableTypes.map((type) => (
            <label key={type}>
              <input data-layer-type={type} type="checkbox" checked={filters.types.includes(type)} onChange={() => toggleType(type)} />
              <span className={`layer-dot marker-${type}`} />
              <span>{mapFeatureLabels[type]}</span>
              <small>{counts[type] ?? 0}</small>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
