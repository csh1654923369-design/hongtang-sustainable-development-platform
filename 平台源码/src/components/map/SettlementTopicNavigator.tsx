"use client";

import {
  ArrowRight,
  CalendarClock,
  CircleDot,
  Droplets,
  Factory,
  Flower2,
  History,
  MapPinned,
  Network,
  TriangleAlert,
  Waypoints,
  X,
} from "lucide-react";
import {
  findTopicLens,
  humanSettlementSystems,
  settlementScales,
  topicFrameworks,
  type SettlementScaleId,
} from "@/lib/humanSettlement";
import type { WaterSystemData, WaterTopicMode } from "@/lib/spatialData";
import { topicColors } from "@/lib/topicSpatialData";
import { villageTopicById, type VillageTopicId } from "@/lib/villageTopics";

const topicIcons = {
  garden: Flower2,
  tea: Factory,
  water: Droplets,
  safety: TriangleAlert,
  history: History,
} as const;

const lensIcons = [MapPinned, Waypoints, CalendarClock] as const;

export function SettlementTopicNavigator({
  data,
  topicId,
  featureCount = 0,
  lensId,
  onLensChange,
  scale = "village",
  onScaleChange,
  onTopicClose,
}: {
  data?: WaterSystemData;
  topicId?: VillageTopicId;
  featureCount?: number;
  lensId?: string;
  onLensChange: (lensId: string) => void;
  scale?: SettlementScaleId;
  onScaleChange: (scale: SettlementScaleId) => void;
  onTopicClose?: () => void;
}) {
  if (!topicId) return null;

  const topic = villageTopicById[topicId];
  const framework = topicFrameworks[topicId];
  const lens = findTopicLens(topicId, lensId);
  const activeScale = lens.scales.includes(scale) ? scale : lens.scales[0];
  const TopicIcon = topicIcons[topicId];
  const waterSection = topicId === "water" && ["overview", "supply", "drainage"].includes(lens.id)
    ? data?.story?.[lens.id as Exclude<WaterTopicMode, "off">]
    : undefined;
  const summary = waterSection?.summary ?? lens.summary;
  const chain = waterSection?.chain ?? lens.chain;

  return (
    <section
      className={`water-topic-navigator settlement-topic-navigator village-topic-navigator topic-${topicId}`}
      aria-label={`${topic.title}专题`}
      data-active-village-topic={topicId}
      style={{ "--active-topic-color": topicColors[topicId] } as React.CSSProperties}
    >
      <div className="water-topic-heading">
        <span><TopicIcon size={21} aria-hidden="true" /></span>
        <div><strong>{topic.title}</strong><small>从一个问题开始看红塘</small></div>
        <button type="button" onClick={onTopicClose} aria-label={`退出${topic.title}专题`}><X size={18} /></button>
      </div>
      <p className="water-topic-question">{waterSection?.question ?? lens.question}</p>

      <div className="water-topic-modes settlement-topic-lenses" role="group" aria-label={`选择${topic.title}专题问题`}>
        {framework.lenses.map((item, index) => {
          const Icon = lensIcons[index] ?? CircleDot;
          return (
            <button key={item.id} type="button" className={lens.id === item.id ? "active" : ""} aria-pressed={lens.id === item.id} onClick={() => onLensChange(item.id)}>
              <Icon size={17} aria-hidden="true" />{item.label}
            </button>
          );
        })}
      </div>

      <div className="settlement-scale-switch" role="group" aria-label="选择观察尺度">
        <span>看多大范围</span>
        <div>{lens.scales.map((item) => <button key={item} type="button" className={activeScale === item ? "active" : ""} aria-pressed={activeScale === item} onClick={() => onScaleChange(item)}>{settlementScales[item].label}</button>)}</div>
      </div>

      <div className="water-topic-reading settlement-topic-reading">
        <p>{summary}</p>
        <div className="water-topic-chain" aria-label={`${lens.label}关系链`}>
          {chain.map((step, index) => (
            <span key={`${step}-${index}`}><b>{step}</b>{index < chain.length - 1 ? <ArrowRight size={14} aria-hidden="true" /> : null}</span>
          ))}
        </div>
        <div className="settlement-scale-reading"><MapPinned size={15} aria-hidden="true" /><span><b>{settlementScales[activeScale].label}：</b>{settlementScales[activeScale].prompt}</span></div>
      </div>

      <div className="settlement-system-links" aria-label="这个问题连接的人居系统">
        <span><Network size={14} aria-hidden="true" />这个问题还连接</span>
        <div>{lens.systems.map((systemId) => <b key={systemId}>{humanSettlementSystems[systemId].shortLabel}</b>)}</div>
      </div>

      <div className={`village-topic-data-state${featureCount ? " has-data" : " is-empty"}`}>
        <strong>{featureCount ? `地图中已有${featureCount}项相关资料` : "资料等待调查"}</strong>
        <span>{featureCount ? "点击地点、线路或片区，查看它与谁有关、依据是什么、下一步做什么。" : topic.emptyMessage}</span>
      </div>
    </section>
  );
}
