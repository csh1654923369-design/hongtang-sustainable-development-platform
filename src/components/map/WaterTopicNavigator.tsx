"use client";

import { ArrowRight, Droplets, House, Waves, X } from "lucide-react";
import type { WaterSystemData, WaterTopicMode } from "@/lib/spatialData";

const modeOptions = [
  { id: "overview", label: "水系统全貌", icon: Droplets },
  { id: "supply", label: "饮水从哪来", icon: House },
  { id: "drainage", label: "排水到哪里", icon: Waves },
] as const;

export function WaterTopicNavigator({
  data,
  mode,
  onModeChange,
}: {
  data?: WaterSystemData;
  mode: WaterTopicMode;
  onModeChange: (mode: WaterTopicMode) => void;
}) {
  if (mode === "off") return null;

  const activeMode = mode;
  const section = data?.story?.[activeMode];

  return (
    <section className="water-topic-navigator" aria-label="村里用水专题">
      <div className="water-topic-heading">
        <span><Droplets size={21} aria-hidden="true" /></span>
        <div><strong>{data?.story?.title ?? "村里的水"}</strong><small>沿着关系看懂村庄</small></div>
        <button type="button" onClick={() => onModeChange("off")} aria-label="退出水专题"><X size={18} /></button>
      </div>
      <p className="water-topic-question">{section?.question ?? data?.story?.question ?? "水从哪里来，经过哪里，被谁使用，最后到哪里去？"}</p>
      <div className="water-topic-modes" role="group" aria-label="选择用水专题视角">
        {modeOptions.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={activeMode === id ? "active" : ""}
            aria-pressed={activeMode === id}
            onClick={() => onModeChange(id)}
          >
            <Icon size={17} aria-hidden="true" />{label}
          </button>
        ))}
      </div>
      {section ? (
        <div className="water-topic-reading">
          <p>{section.summary}</p>
          <div className="water-topic-chain" aria-label={`${section.title}关系链`}>
            {section.chain.map((step, index) => (
              <span key={`${step}-${index}`}><b>{step}</b>{index < section.chain.length - 1 ? <ArrowRight size={14} aria-hidden="true" /> : null}</span>
            ))}
          </div>
        </div>
      ) : null}
      <small className="water-topic-help">点击地图中的水源、线路或片区，可以顺着上下游继续查看。当前内容为待实地核实的结构示意。</small>
    </section>
  );
}
