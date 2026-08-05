"use client";

import { ArrowRight, CalendarClock, MapPin, PackageSearch, UsersRound } from "lucide-react";
import { MicroAction, MicroActionStatus } from "@/types";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";
import { microActionStatusLabels } from "@/lib/utils";

export function MicroActionCard({ action, compact = false }: { action: MicroAction; compact?: boolean }) {
  const { role, joinedMicroActionIds, joinMicroAction, notify } = useDemo();
  const joined = joinedMicroActionIds.includes(action.id);
  const canJoin = action.status === MicroActionStatus.Recruiting || action.status === MicroActionStatus.Experimenting;
  const join = () => {
    if (!can(role, "startAction")) { notify("请切换为村民或协作者", "游客可以浏览行动计划，但不能加入行动小组。"); return; }
    joinMicroAction(action.id);
  };
  return (
    <article className={`micro-action-card ${compact ? "compact" : ""} ${action.submittedByMe ? "mine" : ""}`}>
      <div className="micro-action-card-top"><div className="inline-badges"><DemoDataBadge label="社区微行动" /><span className={`micro-action-status status-${action.status}`}>{microActionStatusLabels[action.status]}</span>{action.submittedByMe ? <span className="soft-tag">我发起的</span> : null}</div><strong>{action.code}</strong></div>
      <h3>{action.title}</h3>
      <p>{action.summary}</p>
      <div className="micro-action-meta"><span><MapPin size={15} />{action.location}</span><span><CalendarClock size={15} />{action.durationDays} 天试验</span><span><UsersRound size={15} />{action.participantCount} 人参与</span></div>
      {!compact ? <><div className="micro-action-purpose"><strong>希望发生的变化</strong><p>{action.desiredChange}</p></div><div className="micro-action-needs"><strong><PackageSearch size={16} />目前需要</strong><div className="chip-list">{[...action.neededResources, ...action.rolesNeeded].map((item) => <i key={item}>{item}</i>)}</div></div><div className="micro-action-next"><span>下一步</span><p>{action.nextStep}</p></div></> : null}
      <div className="micro-action-card-footer"><span>发起：{action.initiator}</span><button className="button button-secondary" disabled={joined || !canJoin || action.submittedByMe} onClick={join}>{action.submittedByMe ? "等待轻量核对" : joined ? "已加入行动小组" : canJoin ? <>加入行动 <ArrowRight size={16} /></> : "暂不招募"}</button></div>
    </article>
  );
}
