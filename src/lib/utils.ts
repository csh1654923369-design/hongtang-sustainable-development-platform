import { IssueStatus, MapFeatureType, ProjectStatus, ReviewStatus, UserRole } from "@/types";

export const roleLabels: Record<UserRole, string> = {
  [UserRole.Visitor]: "游客",
  [UserRole.Resident]: "村民",
  [UserRole.Collaborator]: "学生 / 规划协作者",
  [UserRole.Admin]: "管理员 / 村委",
};

export const issueStatusLabels: Record<IssueStatus, string> = {
  [IssueStatus.Pending]: "待审核",
  [IssueStatus.Accepted]: "已受理",
  [IssueStatus.Assigned]: "已分派",
  [IssueStatus.Processing]: "处理中",
  [IssueStatus.Completed]: "已完成",
  [IssueStatus.Rated]: "已评价",
  [IssueStatus.Rejected]: "暂不受理",
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  [ProjectStatus.Planning]: "筹备中",
  [ProjectStatus.Discussion]: "方案讨论",
  [ProjectStatus.Active]: "实施中",
  [ProjectStatus.Completed]: "已完成",
  [ProjectStatus.Maintenance]: "持续维护",
};

export const mapFeatureLabels: Record<MapFeatureType, string> = {
  [MapFeatureType.Issue]: "村庄问题",
  [MapFeatureType.Project]: "建设项目",
  [MapFeatureType.CompletedAction]: "已完成行动",
  [MapFeatureType.PublicService]: "公共服务设施",
  [MapFeatureType.Ecology]: "生态资源",
  [MapFeatureType.Culture]: "文化资源",
  [MapFeatureType.ResearchPhoto]: "调研照片",
  [MapFeatureType.Building]: "建筑",
  [MapFeatureType.Road]: "道路",
  [MapFeatureType.Water]: "水体",
};

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  [ReviewStatus.Pending]: "待专业审核",
  [ReviewStatus.Approved]: "已通过",
  [ReviewStatus.Revision]: "退回修改",
  [ReviewStatus.Duplicate]: "标记重复",
  [ReviewStatus.Rejected]: "已拒绝",
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}
