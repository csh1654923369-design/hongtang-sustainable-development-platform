"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, CalendarDays, MapPin, Star, UserRound, Wrench } from "lucide-react";
import { FormEvent, useState } from "react";
import { BeforeAfterComparison } from "@/components/common/BeforeAfterComparison";
import { CommentSection } from "@/components/common/CommentSection";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Timeline } from "@/components/common/Timeline";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";
import { issueStatusLabels } from "@/lib/utils";
import { contentService } from "@/services/content";
import { IssueStatus } from "@/types";

const ratingLabels = ["不满意", "一般", "满意", "非常满意"];

export function IssueDetailClient({ id }: { id: string }) {
  const { role, issues, rateIssue, notify } = useDemo();
  const issue = issues.find((item) => item.id === id || item.code === id);
  const [rating, setRating] = useState(issue?.rating ?? 0);
  const [comment, setComment] = useState("");
  const goal = issue ? contentService.getGoal(issue.goalId) : undefined;

  if (!issue) return <div className="page-container not-found-card"><AlertCircle size={40} /><h1>没有找到这个问题</h1><p>它可能只存在于另一个演示会话中，或链接不完整。</p><Link href="/map" className="button button-primary">返回行动地图</Link></div>;

  const submitRating = (event: FormEvent) => {
    event.preventDefault();
    if (!can(role, "rateIssue")) { notify("请切换为村民角色后评价", "游客可以查看公开办理过程。" ); return; }
    if (!rating) { notify("请选择满意度", "请选择一项评价后再提交。" ); return; }
    rateIssue(issue.id, rating, comment);
  };

  return (
    <main className="issue-detail-page">
      <div className="page-container detail-back"><Link href="/map"><ArrowLeft size={17} />返回行动地图</Link></div>
      <section className="issue-detail-hero page-container">
        <div><div className="inline-badges"><DemoDataBadge /><span className="issue-code">{issue.code}</span><StatusBadge status={issue.status} /></div><h1>{issue.title}</h1><p>{issue.description}</p><div className="issue-hero-facts"><span><MapPin size={17} />{issue.location}</span><span><CalendarDays size={17} />提交于 {issue.submittedAt}</span><span><UserRound size={17} />{issue.publicName ? "村民公开提交" : "村民匿名公开"}</span></div></div>
        <aside className="issue-status-card"><span>当前办理状态</span><strong>{issueStatusLabels[issue.status]}</strong><p>最近更新：{issue.updatedAt}</p><div className="progress-track"><span style={{ width: `${Math.min(100, (issue.history.length / 6) * 100)}%` }} /></div><small>流程进度根据演示时间线估算</small></aside>
      </section>

      <div className="page-container detail-two-column">
        <div className="detail-main">
          <section className="content-card"><div className="card-heading"><h2>上报信息</h2><DemoDataBadge /></div><div className="issue-photo-placeholder"><span>{issue.imageLabel}</span><small>未使用未经确认来源的真实村庄图片</small></div><dl className="facts-grid"><div><dt>问题类型</dt><dd>{issue.type}</dd></div><div><dt>影响日常生活</dt><dd>{issue.affectsDailyLife ? "是" : "否"}</dd></div><div><dt>希望尽快处理</dt><dd>{issue.urgent ? "是" : "否"}</dd></div><div><dt>演示坐标</dt><dd>{issue.longitude.toFixed(4)}, {issue.latitude.toFixed(4)}</dd></div></dl></section>
          <section className="content-card"><div className="card-heading"><h2>办理时间线</h2><span>{issue.history.length} 条记录</span></div><Timeline items={issue.history} /></section>
          {issue.status === IssueStatus.Completed || issue.status === IssueStatus.Rated ? <section className="content-card"><div className="card-heading"><h2>处理结果与前后对比</h2><StatusBadge status={issue.status} /></div><p>{issue.result ?? "已完成演示现场处理并上传结果记录。"}</p><BeforeAfterComparison beforeLabel={issue.imageLabel} afterLabel={issue.afterImageLabel ?? "整改后照片占位"} /></section> : null}
          {(issue.status === IssueStatus.Completed || issue.status === IssueStatus.Rated) ? <section className="content-card rating-card"><div className="card-heading"><h2>村民满意度评价</h2>{issue.rating ? <span>已评价 {issue.rating} / 4</span> : <span>等待评价</span>}</div><form onSubmit={submitRating}><div className="rating-options">{ratingLabels.map((label, index) => <button type="button" key={label} className={rating === index + 1 ? "active" : ""} onClick={() => setRating(index + 1)}><Star size={20} fill={rating === index + 1 ? "currentColor" : "none"} /><span>{label}</span></button>)}</div><label className="field-label">补充意见（选填）<textarea className="text-area" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="处理结果是否解决了问题？还有哪些建议？" /></label><button className="button button-primary" type="submit" disabled={issue.status === IssueStatus.Rated}>提交评价</button></form></section> : null}
          <CommentSection />
        </div>
        <aside className="detail-sidebar">
          <section className="content-card"><h3>办理信息</h3><dl className="sidebar-facts"><div><dt><Wrench size={16} />责任人或工作组</dt><dd>{issue.assignee ?? "待管理员分派"}</dd></div><div><dt>关联目标</dt><dd>{goal?.title ?? "待关联"}</dd></div><div><dt>关联项目</dt><dd>{issue.projectId ? <Link href="/projects">查看关联演示项目</Link> : "暂无关联项目"}</dd></div></dl></section>
          <section className="content-card mini-map-card"><h3>问题位置</h3><div className="mini-location-map"><span style={{ left: "57%", top: "48%" }}><MapPin size={21} /></span><small>简化位置示意 · 演示坐标</small></div><p>{issue.location}</p></section>
          <section className="privacy-card"><strong>公开说明</strong><p>该页面使用演示数据，不代表红塘村真实问题、责任分派或办理结论。</p></section>
        </aside>
      </div>
    </main>
  );
}
