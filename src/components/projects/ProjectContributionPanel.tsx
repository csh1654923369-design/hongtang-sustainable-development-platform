"use client";

import { CheckCircle2, Clock3, HandHeart, PackageSearch, UsersRound } from "lucide-react";
import { useState } from "react";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";
import { communityResourceCategoryLabels } from "@/lib/utils";
import { Project } from "@/types";

export function ProjectContributionPanel({ project }: { project: Project }) {
  const { role, notify } = useDemo();
  const [claimedTaskIds, setClaimedTaskIds] = useState<string[]>([]);
  const [offeredResourceIds, setOfferedResourceIds] = useState<string[]>([]);
  const claimTask = (id: string) => {
    if (!can(role, "joinActivity")) { notify("请切换为村民或协作者", "游客可以查看任务，但不能认领。" ); return; }
    setClaimedTaskIds((current) => current.includes(id) ? current : [...current, id]);
    notify("任务已加入我的参与意向", "项目协调员将在演示流程中确认时间和分工。", "success");
  };
  const offerResource = (id: string) => {
    if (!can(role, "shareResource")) { notify("请切换为村民或协作者", "游客可以查看资源需求，但不能回应。" ); return; }
    setOfferedResourceIds((current) => current.includes(id) ? current : [...current, id]);
    notify("资源回应已记录", "平台会代为转达，不会公开个人联系方式。", "success");
  };
  return (
    <section className="content-card project-contribution-panel">
      <div className="card-heading"><div><h2>现在可以一起做什么？</h2><p>按时间、角色和资源需求参与，不用只留下笼统的“我愿意”。</p></div><DemoDataBadge /></div>
      <div className="project-contribution-columns"><div><h3><UsersRound size={18} />开放任务</h3><div className="project-task-list">{project.tasks.map((task) => { const claimed = claimedTaskIds.includes(task.id); return <article key={task.id}><div><span className={`task-state ${task.status}`}>{task.status === "open" ? `开放 ${task.slots} 个名额` : task.status === "claimed" ? "已有伙伴" : "已完成"}</span><h4>{task.title}</h4><p>{task.description}</p><small><Clock3 size={14} />{task.effort} · {task.role}</small></div><button className="button button-secondary" disabled={claimed || task.status !== "open"} onClick={() => claimTask(task.id)}>{claimed ? <><CheckCircle2 size={16} />已认领</> : "认领任务"}</button></article>; })}</div></div><div><h3><PackageSearch size={18} />资源需求</h3><div className="project-resource-list">{project.resourceNeeds.map((need) => { const offered = offeredResourceIds.includes(need.id); return <article key={need.id}><span>{communityResourceCategoryLabels[need.category]}</span><div><h4>{need.label}</h4><p>{need.quantity} · {need.status === "matched" ? "已匹配" : "仍需要"}</p></div><button className="icon-button" aria-label={`回应资源：${need.label}`} disabled={offered || need.status === "matched"} onClick={() => offerResource(need.id)}>{offered || need.status === "matched" ? <CheckCircle2 size={18} /> : <HandHeart size={18} />}</button></article>; })}</div><div className="project-next-meeting"><strong>下一次碰面</strong><p>{project.nextMeeting}</p><small>协调人：{project.facilitator}</small></div></div></div>
    </section>
  );
}
