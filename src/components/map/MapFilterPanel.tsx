"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { MapFeatureType } from "@/types";
import { mapFeatureLabels } from "@/lib/utils";
import { contentService } from "@/services/content";

const goals = contentService.getGoals();
const layers = Object.values(MapFeatureType);

export interface MapFilters {
  types: MapFeatureType[];
  status: string;
  goalId: string;
  participationOnly: boolean;
  mineOnly: boolean;
}

export const initialMapFilters: MapFilters = { types: layers, status: "all", goalId: "all", participationOnly: false, mineOnly: false };

export function MapFilterPanel({ filters, onChange, onReset }: { filters: MapFilters; onChange: (next: MapFilters) => void; onReset: () => void }) {
  const toggleType = (type: MapFeatureType) => onChange({ ...filters, types: filters.types.includes(type) ? filters.types.filter((item) => item !== type) : [...filters.types, type] });
  return (
    <aside className="map-filter-panel">
      <div className="filter-heading"><span><SlidersHorizontal size={18} />筛选与图层</span><button onClick={onReset}><RotateCcw size={15} />重置</button></div>
      <div className="filter-group"><strong>地图图层</strong><div className="layer-list">{layers.map((type) => <label key={type}><input type="checkbox" checked={filters.types.includes(type)} onChange={() => toggleType(type)} /><span className={`layer-dot marker-${type}`} />{mapFeatureLabels[type]}</label>)}</div></div>
      <div className="filter-group"><label className="field-label">状态<select className="select-input" value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}><option value="all">全部状态</option><option value="待审核">待审核</option><option value="已受理">已受理</option><option value="处理中">处理中</option><option value="已完成">已完成</option><option value="持续观察">持续观察</option></select></label></div>
      <div className="filter-group"><label className="field-label">所属目标<select className="select-input" value={filters.goalId} onChange={(event) => onChange({ ...filters, goalId: event.target.value })}><option value="all">全部目标</option>{goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.shortTitle}</option>)}</select></label></div>
      <div className="filter-group switch-list"><label><input type="checkbox" checked={filters.participationOnly} onChange={(event) => onChange({ ...filters, participationOnly: event.target.checked })} />仅看可参与内容</label><label><input type="checkbox" checked={filters.mineOnly} onChange={(event) => onChange({ ...filters, mineOnly: event.target.checked })} />仅看“我提交的”</label></div>
    </aside>
  );
}
