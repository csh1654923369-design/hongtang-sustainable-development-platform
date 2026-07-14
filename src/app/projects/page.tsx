import { PageHeader } from "@/components/common/PageHeader";
import { ProjectListClient } from "@/components/projects/ProjectListClient";
import { projectService } from "@/services/projects";

export default function ProjectsPage() {
  const projects = projectService.list();
  return <main><PageHeader eyebrow="PROJECTS & ACTIONS" title="项目与行动" description="查看问题如何被纳入项目、形成方案、推进实施，并在完成后进入持续维护。所有项目均为演示项目。" /><section className="page-container page-section list-page"><ProjectListClient projects={projects} /></section></main>;
}
