"use client";

import { Filter, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Project, ProjectStatus } from "@/types";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { EmptyState } from "@/components/common/EmptyState";
import { contentService } from "@/services/content";

export function ProjectListClient({ projects }: { projects: Project[] }) {
  const goals = contentService.getGoals();
  const [goal, setGoal] = useState("all");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [recruiting, setRecruiting] = useState(false);
  const types = Array.from(new Set(projects.map((item) => item.type)));
  const visible = useMemo(() => projects.filter((project) => (goal === "all" || project.goalId === goal) && (status === "all" || project.status === status) && (type === "all" || project.type === type) && (!recruiting || project.recruiting)), [projects, goal, status, type, recruiting]);
  const reset = () => { setGoal("all"); setStatus("all"); setType("all"); setRecruiting(false); };
  return (
    <div>
      <div className="list-filter-bar"><strong><Filter size={18} />筛选项目</strong><label>所属目标<select value={goal} onChange={(event) => setGoal(event.target.value)}><option value="all">全部目标</option>{goals.map((item) => <option value={item.id} key={item.id}>{item.shortTitle}</option>)}</select></label><label>项目状态<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部状态</option>{Object.values(ProjectStatus).map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label>项目类型<select value={type} onChange={(event) => setType(event.target.value)}><option value="all">全部类型</option>{types.map((item) => <option key={item}>{item}</option>)}</select></label><label className="check-row"><input type="checkbox" checked={recruiting} onChange={(event) => setRecruiting(event.target.checked)} />仅看招募中</label><button onClick={reset}><RotateCcw size={15} />重置</button></div>
      <div className="results-count">共找到 <strong>{visible.length}</strong> 个演示项目</div>
      {visible.length ? <div className="project-grid">{visible.map((project) => <ProjectCard key={project.id} project={project} />)}</div> : <EmptyState title="没有符合条件的项目" description="可以重置筛选条件查看全部演示项目。" />}
    </div>
  );
}
