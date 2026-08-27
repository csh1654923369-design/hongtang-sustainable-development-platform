"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, CircleHelp, Link2, PencilRuler, UserRoundCheck } from "lucide-react";
import {
  actionStages,
  evidenceStatuses,
  resolveHumanSettlementProfile,
  settlementScales,
  topicForFeatureType,
  type HumanSettlementProfile,
} from "@/lib/humanSettlement";
import type { VillageTopicId } from "@/lib/villageTopics";
import type { MapFeatureType } from "@/types";

export function HumanSettlementDetail({
  topicId,
  featureType,
  status,
  updatedAt,
  profile,
  featureId,
  editorKind,
  recordDates = [],
}: {
  topicId?: VillageTopicId;
  featureType?: MapFeatureType;
  status?: string;
  updatedAt?: string;
  profile?: HumanSettlementProfile;
  featureId: string;
  editorKind: "base-point" | "water-node" | "water-line" | "water-zone" | "topic-spatial";
  recordDates?: string[];
}) {
  const resolvedTopic = topicId ?? topicForFeatureType(featureType);
  if (!resolvedTopic) return null;
  const resolved = resolveHumanSettlementProfile({ topicId: resolvedTopic, featureType, status, updatedAt, existing: profile });
  const evidence = evidenceStatuses[resolved.evidenceStatus];
  const action = actionStages[resolved.actionStage];
  const dates = [...new Set([resolved.observedAt, ...recordDates].filter(Boolean))] as string[];

  return (
    <section className="settlement-detail" aria-label="资料核实、关系与行动">
      <div className="settlement-detail-heading"><CheckCircle2 size={17} /><strong>这条资料现在到哪一步</strong></div>
      <div className="settlement-state-grid">
        <article data-evidence-status={resolved.evidenceStatus}>
          <span><UserRoundCheck size={15} />资料依据</span>
          <strong>{evidence.label}</strong>
          <p>{resolved.evidenceNote || evidence.description}</p>
        </article>
        <article data-action-stage={resolved.actionStage}>
          <span><ArrowRight size={15} />当前进度</span>
          <strong>{action.label}</strong>
          <p>{resolved.nextAction || action.nextLabel}</p>
        </article>
      </div>

      <div className="settlement-detail-block">
        <span><Link2 size={15} /><b>它与什么有关</b></span>
        <div className="settlement-relation-tags">{resolved.relatedLabels?.map((label) => <em key={label}>{label}</em>)}</div>
      </div>

      <div className="settlement-detail-meta">
        <span><CalendarClock size={15} /><b>观察尺度</b>{settlementScales[resolved.scale].label}</span>
        <span><UserRoundCheck size={15} /><b>维护或行动者</b>{resolved.steward}</span>
      </div>
      {dates.length ? <div className="settlement-timeline"><span><CalendarClock size={15} /><b>变化记录</b></span><div>{dates.slice(0, 4).map((date, index) => <time key={`${date}-${index}`}>{date}{index === 0 ? "　最近记录" : ""}</time>)}</div></div> : null}

      <div className="settlement-next-step">
        <CircleHelp size={17} aria-hidden="true" />
        <div><strong>发现信息不准或有新变化？</strong><span>可以先在地图编辑页修改；V1.2 仍只保存本次浏览器会话，不会覆盖数据库。</span></div>
        <Link href={`/map-editor?feature=${encodeURIComponent(featureId)}&kind=${editorKind}`} target="_blank" rel="noopener noreferrer" prefetch={false}><PencilRuler size={15} />补充或核实</Link>
      </div>
    </section>
  );
}
