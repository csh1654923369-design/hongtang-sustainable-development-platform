"use client";

import { ArrowRight, Droplets, Factory, Flower2, History, House, TriangleAlert, Waves, X } from "lucide-react";
import type { WaterSystemData, WaterTopicMode } from "@/lib/spatialData";
import { villageTopicById, type VillageTopicId } from "@/lib/villageTopics";

const modeOptions = [
  { id: "overview", label: "水系统全貌", icon: Droplets },
  { id: "supply", label: "饮水从哪来", icon: House },
  { id: "drainage", label: "排水到哪里", icon: Waves },
] as const;

const topicIcons = {
  garden: Flower2,
  tea: Factory,
  water: Droplets,
  safety: TriangleAlert,
  history: History,
} as const;

export function WaterTopicNavigator({
  data,
  mode,
  onModeChange,
  topicId,
  featureCount = 0,
  onTopicClose,
}: {
  data?: WaterSystemData;
  mode: WaterTopicMode;
  onModeChange: (mode: WaterTopicMode) => void;
  topicId?: VillageTopicId;
  featureCount?: number;
  onTopicClose?: () => void;
}) {
  if (!topicId) return null;

  const topic = villageTopicById[topicId];
  const TopicIcon = topicIcons[topicId];
  const isWater = topicId === "water";
  const activeMode = mode === "off" ? "overview" : mode;
  const section = isWater ? data?.story?.[activeMode] : undefined;
  const closeTopic = () => {
    onModeChange("off");
    onTopicClose?.();
  };

  return (
    <section className={`water-topic-navigator village-topic-navigator topic-${topicId}`} aria-label={`${topic.title}专题`} data-active-village-topic={topicId}>
      <div className="water-topic-heading">
        <span><TopicIcon size={21} aria-hidden="true" /></span>
        <div><strong>{isWater ? (data?.story?.title ?? topic.title) : topic.title}</strong><small>{topic.shortDescription}</small></div>
        <button type="button" onClick={closeTopic} aria-label={isWater ? "退出水专题" : `退出${topic.title}专题`}><X size={18} /></button>
      </div>
      <p className="water-topic-question">{section?.question ?? (isWater ? data?.story?.question : topic.question) ?? topic.question}</p>
      {isWater ? (
        <>
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
          <small className="water-topic-help">点击地图中的水源、线路或片区，可以顺着上下游继续查看。当前水系统结构仍需实地核实。</small>
        </>
      ) : (
        <>
          <div className="village-topic-focus" aria-label={`${topic.title}关注内容`}>
            {topic.focus.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div className={`village-topic-data-state${featureCount ? " has-data" : " is-empty"}`}>
            <strong>{featureCount ? `已接入${featureCount}项空间资料` : "资料待调查"}</strong>
            <span>{featureCount ? "点击地图中的地点查看现有资料；未填写的长期记录仍需后续补充。" : topic.emptyMessage}</span>
          </div>
        </>
      )}
    </section>
  );
}
