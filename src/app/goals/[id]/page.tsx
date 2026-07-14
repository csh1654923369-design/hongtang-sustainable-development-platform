import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, MapPinPlus, MessageSquarePlus, UsersRound } from "lucide-react";
import { contentService } from "@/services/content";
import { indicatorService } from "@/services/indicators";
import { projectService } from "@/services/projects";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { GoalMapPreview } from "@/components/goals/GoalMapPreview";
import { IndicatorCard } from "@/components/dashboard/IndicatorCard";
import { ProjectCard } from "@/components/projects/ProjectCard";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = contentService.getGoal(id);
  if (!goal) notFound();
  const indicators = indicatorService.listByGoal(goal.id);
  const projects = projectService.listByGoal(goal.id);
  const features = contentService.getMapFeatures().filter((feature) => feature.goalId === goal.id).slice(0, 6);
  return (
    <main className="goal-detail-page">
      <div className="page-container detail-back"><Link href="/goals"><ArrowLeft size={17} />返回目标总览</Link></div>
      <section className="goal-detail-hero" style={{ "--goal-color": goal.color } as React.CSSProperties}><div className="page-container"><div className="goal-index">目标 {goal.index}</div><div><div className="inline-badges"><DemoDataBadge /><span className="status-badge">{goal.status}</span></div><h1>{goal.title}</h1><p>{goal.meaning}</p><div className="sdg-tags">{goal.sdgTags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><aside><strong>{projects.length}</strong><span>关联项目</span><strong>{indicators.length}</strong><span>观察指标</span></aside></div></section>
      <section className="page-section page-container"><div className="detail-two-column"><div className="detail-main"><section className="content-card"><div className="card-heading"><h2>这个目标在红塘村意味着什么？</h2><DemoDataBadge /></div><p className="lead-text">{goal.description}</p><p>{goal.meaning}</p></section><section className="content-card"><div className="card-heading"><h2>当前需要共同观察的问题</h2><span>不是既定结论</span></div><div className="challenge-grid">{goal.challenges.map((item, index) => <article key={item}><span>{index + 1}</span><p>{item}</p></article>)}</div></section></div><aside className="detail-sidebar"><section className="participation-callout"><strong>参与这个目标</strong><p>你可以从一次具体观察或建议开始。</p><Link href="/report" className="button button-primary"><MapPinPlus size={17} />提交相关问题</Link><Link href="/participate" className="button button-secondary"><MessageSquarePlus size={17} />提出村庄建议</Link><Link href="/participate" className="button button-secondary"><UsersRound size={17} />参加社区行动</Link></section></aside></div></section>
      <section className="page-section indicator-section"><div className="page-container"><div className="section-heading"><div><span>观察指标</span><h2>如何知道变化正在发生？</h2></div><p>指标包含来源、更新时间和完整度，不把演示值包装成真实统计。</p></div><div className="indicator-grid">{indicators.map((indicator) => <IndicatorCard indicator={indicator} key={indicator.id} />)}</div></div></section>
      {projects.length ? <section className="page-section page-container"><div className="section-heading"><div><span>相关项目</span><h2>正在把目标转化为哪些行动？</h2></div></div><div className="project-grid">{projects.map((project) => <ProjectCard project={project} key={project.id} />)}</div></section> : null}
      {features.length ? <section className="page-section goal-map-section"><div className="page-container"><div className="section-heading"><div><span>相关地点</span><h2>目标在地图上的具体位置</h2></div><Link href="/map">打开完整地图 <ArrowRight size={16} /></Link></div><GoalMapPreview features={features} /></div></section> : null}
    </main>
  );
}
