import { projects } from "@/data/mockData";

export const projectService = {
  list() {
    return projects.map((project) => ({ ...project, updates: [...project.updates], evidence: [...project.evidence], communityVoices: [...project.communityVoices], tasks: project.tasks.map((task) => ({ ...task })), resourceNeeds: project.resourceNeeds.map((need) => ({ ...need })) }));
  },

  getBySlug(slug: string) {
    const project = projects.find((item) => item.slug === slug || item.id === slug);
    return project ? { ...project, updates: [...project.updates], evidence: [...project.evidence], communityVoices: [...project.communityVoices], tasks: project.tasks.map((task) => ({ ...task })), resourceNeeds: project.resourceNeeds.map((need) => ({ ...need })) } : undefined;
  },

  listByGoal(goalId: string) {
    return projects.filter((project) => project.goalId === goalId);
  },
};
