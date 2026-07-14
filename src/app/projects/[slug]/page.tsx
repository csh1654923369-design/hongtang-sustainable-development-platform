import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Target, UsersRound, WalletCards } from "lucide-react";
import { projectService } from "@/services/projects";
import { activityService } from "@/services/activities";
import { contentService } from "@/services/content";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { Timeline } from "@/components/common/Timeline";
import { BeforeAfterComparison } from "@/components/common/BeforeAfterComparison";
import { ProjectActions } from "@/components/projects/ProjectActions";
import { ActivityCard } from "@/components/participation/ActivityCard";
import { CommentSection } from "@/components/common/CommentSection";
import { IssueCard } from "@/components/issues/IssueCard";
import { issueService } from "@/services/issues";

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projectService.getBySlug(slug);
  if (!project) notFound();
  const goal = contentService.getGoal(project.goalId);
  const activities = activityService.list().filter((item) => project.relatedActivityIds.includes(item.id));
  const relatedIssues = issueService.list().filter((issue) => project.relatedIssueIds.includes(issue.id));
  return (
    <main className="project-detail-page">
      <div className="page-container detail-back"><Link href="/projects"><ArrowLeft size={17} />返回项目列表</Link></div>
      <section className={`project-detail-hero project-accent-${project.accent}`}><div className="page-container"><div><div className="inline-badges"><DemoDataBadge label="演示项目" /><StatusBadge status={project.status} /><span className="soft-tag">{project.type}</span></div><h1>{project.title}</h1><p>{project.summary}</p><div className="project-hero-facts"><span><MapPin size={17} />{project.location}</span><span><CalendarDays size={17} />开始于 {project.startDate}</span><span><UsersRound size={17} />{project.participantCount} 人参与</span></div></div><div className="project-progress-ring" style={{ "--progress": `${project.progress * 3.6}deg` } as React.CSSProperties}><span><strong>{project.progress}%</strong>当前进度</span></div></div></section>
      <div className="page-container detail-two-column project-detail-grid"><div className="detail-main">
        <section className="content-card"><div className="card-heading"><h2>项目概况</h2><DemoDataBadge /></div><p className="lead-text">{project.background}</p><dl className="facts-grid project-facts"><div><dt><Target size={16} />所属目标</dt><dd>{goal?.title}</dd></div><div><dt><UsersRound size={16} />负责人</dt><dd>{project.lead}</dd></div><div><dt><WalletCards size={16} />预算</dt><dd>{project.budgetLabel}</dd></div><div><dt>参与主体</dt><dd>{project.participants.join("、")}</dd></div></dl></section>
        <section className="content-card"><div className="card-heading"><h2>项目时间线与进展</h2><span>{project.updates.length} 条记录</span></div><Timeline items={project.updates} /></section>
        <section className="content-card"><div className="card-heading"><h2>改造前后方案比较</h2><span>拖动查看</span></div><BeforeAfterComparison beforeLabel="现状场景占位" afterLabel="改造方案占位" /></section>
        <ProjectActions projectId={project.id} />
        <CommentSection />
      </div><aside className="detail-sidebar"><section className="content-card mini-map-card"><h3>项目位置</h3><div className="mini-location-map project-range"><span><MapPin size={21} /></span><i>演示项目范围</i><small>简化位置示意</small></div><p>{project.location}</p></section><section className="content-card"><h3>关联目标</h3><p>{goal?.description}</p><Link className="card-link" href={`/goals/${goal?.id}`}>查看目标详情 →</Link></section><section className="content-card"><h3>相关问题</h3><p>{relatedIssues.length} 条问题上报推动或关联了这个项目。</p></section></aside></div>
      {relatedIssues.length ? <section className="page-section page-container"><div className="section-heading"><div><span>关联问题</span><h2>项目从哪些问题出发？</h2></div></div><div className="issue-grid">{relatedIssues.map((issue) => <IssueCard key={issue.id} issue={issue} />)}</div></section> : null}
      {activities.length ? <section className="page-section related-activities" id="activity"><div className="page-container"><div className="section-heading"><div><span>参与机会</span><h2>相关社区活动</h2></div></div><div className="activity-stack">{activities.map((activity) => <ActivityCard key={activity.id} activity={activity} />)}</div></div></section> : null}
    </main>
  );
}
