import { ArrowRight, CircleDot, FolderKanban, Gauge } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { GoalCard } from "@/components/goals/GoalCard";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { contentService } from "@/services/content";
import { indicatorService } from "@/services/indicators";
import { projectService } from "@/services/projects";

export default function GoalsPage() {
  const goals = contentService.getGoals();
  const indicators = indicatorService.list();
  const projects = projectService.list();
  return (
    <main><PageHeader eyebrow="LOCAL SUSTAINABILITY GOALS" title="红塘村本地可持续发展目标" description="从村庄日常生活出发组织目标、问题、项目和指标；联合国 SDGs 只作为辅助参照。" />
      <section className="page-container goal-overview-strip"><div><CircleDot size={22} /><span>本地目标</span><strong>5</strong></div><div><Gauge size={22} /><span>观察指标</span><strong>{indicators.length}</strong></div><div><FolderKanban size={22} /><span>关联项目</span><strong>{projects.length}</strong></div><div><DemoDataBadge /><p>所有状态与数值均用于流程演示，不代表红塘村真实统计。</p></div></section>
      <section className="page-section page-container"><div className="goal-grid goals-page-grid">{goals.map((goal) => <GoalCard goal={goal} key={goal.id} />)}</div></section>
      <section className="page-section goal-method"><div className="page-container"><div className="section-heading"><div><span>如何形成闭环</span><h2>目标不是口号，而是行动组织方式</h2></div></div><div className="process-flow">{["发现问题", "地图上报", "审核与分派", "纳入项目", "更新进度", "展示结果", "村民评价", "更新指标"].map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong>{index < 7 ? <ArrowRight size={17} /> : null}</div>)}</div><div className="method-note"><strong>数据原则</strong><p>未经调查确认的人口、面积、收入和历史年份不会出现在平台中；缺失资料会明确标注“待补充真实调查数据”。</p><Link href="/progress">查看演示指标方法 <ArrowRight size={16} /></Link></div></div></section>
    </main>
  );
}
