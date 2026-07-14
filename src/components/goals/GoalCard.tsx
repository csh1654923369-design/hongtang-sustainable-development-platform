import Link from "next/link";
import { ArrowRight, HeartHandshake, Home, Landmark, Leaf, Sprout } from "lucide-react";
import { SustainabilityGoal } from "@/types";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";

const icons = { home: Home, leaf: Leaf, heart: HeartHandshake, sprout: Sprout, landmark: Landmark };

export function GoalCard({ goal, compact = false }: { goal: SustainabilityGoal; compact?: boolean }) {
  const Icon = icons[goal.icon as keyof typeof icons] ?? Leaf;
  return (
    <article className={`goal-card ${compact ? "compact" : ""}`} style={{ "--goal-color": goal.color } as React.CSSProperties}>
      <div className="goal-card-head"><span className="goal-icon"><Icon size={23} /></span><span className="goal-number">目标 {goal.index}</span><DemoDataBadge /></div>
      <h3>{goal.title}</h3>
      <p>{goal.description}</p>
      <div className="goal-meta"><span>{goal.status}</span><span>{goal.projectCount} 个关联项目</span></div>
      <Link href={`/goals/${goal.id}`}>查看目标详情 <ArrowRight size={16} /></Link>
    </article>
  );
}
