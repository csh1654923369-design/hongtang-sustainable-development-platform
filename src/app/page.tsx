import Link from "next/link";
import { ArrowRight, CheckCircle2, Quote } from "lucide-react";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickActionCard } from "@/components/home/QuickActionCard";
import { HomeMapPreview } from "@/components/home/HomeMapPreview";
import { GoalCard } from "@/components/goals/GoalCard";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ActivityCard } from "@/components/participation/ActivityCard";
import { BeforeAfterComparison } from "@/components/common/BeforeAfterComparison";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { contentService } from "@/services/content";
import { projectService } from "@/services/projects";
import { activityService } from "@/services/activities";

export default function HomePage() {
  const features = contentService.getMapFeatures();
  const goals = contentService.getGoals();
  const projects = projectService.list().slice(0, 4);
  const activities = activityService.list().filter((item) => item.status === "open").slice(0, 3);
  return (
    <main>
      <HeroSection />
      <section className="page-section page-container quick-section"><div className="section-heading"><div><span>从这里开始</span><h2>你今天想了解或参与什么？</h2></div><p>不同演示角色会获得不同的操作权限。</p></div><div className="quick-action-grid"><QuickActionCard icon="report" title="上报村庄问题" description="在地图上记录位置和现场情况" href="/report" permission="reportIssue" /><QuickActionCard icon="project" title="查看项目进展" description="跟踪从问题到行动的全过程" href="/projects" /><QuickActionCard icon="activity" title="参加社区活动" description="报名讨论、观察与共创活动" href="/participate" permission="joinActivity" /><QuickActionCard icon="research" title="提交调研成果" description="上传空间资料并进入专业审核" href="/research" permission="submitResearch" /></div></section>

      <section className="page-section map-preview-section"><div className="page-container"><div className="section-heading"><div><span>发现 · 处理 · 反馈</span><h2>村庄行动地图</h2></div><p>把分散的问题、资源和行动放回具体位置，点击点位查看最新状态。</p></div><HomeMapPreview features={features} /></div></section>

      <section className="page-section page-container"><div className="section-heading"><div><span>本地目标体系</span><h2>红塘村可持续发展目标</h2></div><p>联合国 SDGs 作为辅助参照，真正的主体是与村庄日常生活有关的五个本地目标。</p></div><div className="goal-grid">{goals.map((goal) => <GoalCard goal={goal} key={goal.id} />)}</div><div className="section-more"><Link href="/goals" className="button button-secondary">查看全部目标与指标 <ArrowRight size={17} /></Link></div></section>

      <section className="page-section projects-home"><div className="page-container"><div className="section-heading"><div><span>持续更新</span><h2>正在推进的项目</h2></div><Link href="/projects">查看全部项目 <ArrowRight size={16} /></Link></div><div className="project-grid">{projects.map((project) => <ProjectCard project={project} key={project.id} />)}</div></div></section>

      <section className="page-section page-container"><div className="section-heading"><div><span>近期参与机会</span><h2>接下来可以一起做什么？</h2></div><DemoDataBadge /></div><div className="activity-stack">{activities.map((activity) => <ActivityCard activity={activity} compact key={activity.id} />)}</div><div className="section-more"><Link href="/participate" className="button button-secondary">进入公众参与中心 <ArrowRight size={17} /></Link></div></section>

      <section className="page-section change-section"><div className="page-container change-grid"><div><div className="eyebrow-line"><span>最近的村庄变化</span><DemoDataBadge /></div><h2>从一次上报，到一次可被评价的完成</h2><p>演示问题“村巷夜间照明偏暗”经过上报、受理、分派、现场处理和结果上传，目前等待村民评价。</p><ul className="check-list"><li><CheckCircle2 size={18} />办理过程公开可追踪</li><li><CheckCircle2 size={18} />整改结果保留前后记录</li><li><CheckCircle2 size={18} />村民评价回到发展指标</li></ul><Link href="/issues/issue-4" className="button button-primary">查看完整办理过程 <ArrowRight size={17} /></Link></div><BeforeAfterComparison beforeLabel="整改前 · 照明点位" afterLabel="整改后 · 检查记录" /></div></section>

      <section className="home-closing"><div className="page-container"><Quote size={28} /><p>“共同记录村庄，共同参与行动，共同见证改变。”</p><span>平台所有具体村情资料将在实地调研和村委确认后补充</span></div></section>
    </main>
  );
}
