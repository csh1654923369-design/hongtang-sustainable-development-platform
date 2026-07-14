import Link from "next/link";
import { ArrowRight, MapPin, UsersRound } from "lucide-react";
import { Project } from "@/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { formatDate } from "@/lib/utils";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className={`project-card project-accent-${project.accent}`}>
      <div className="project-cover"><span>项目场景图占位</span><DemoDataBadge label="演示项目" /></div>
      <div className="project-card-body">
        <div className="project-card-status"><StatusBadge status={project.status} /><span>{project.type}</span></div>
        <h3>{project.title}</h3><p>{project.summary}</p>
        <div className="project-location"><MapPin size={15} />{project.location}</div>
        <div className="progress-label"><span>当前进度</span><strong>{project.progress}%</strong></div><div className="progress-track"><span style={{ width: `${project.progress}%` }} /></div>
        <div className="project-card-footer"><span><UsersRound size={15} />{project.participantCount} 人参与</span><span>更新于 {formatDate(project.updatedAt)}</span></div>
        <Link href={`/projects/${project.slug}`}>查看项目 <ArrowRight size={16} /></Link>
      </div>
    </article>
  );
}
