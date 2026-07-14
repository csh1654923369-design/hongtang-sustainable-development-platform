import { UserRole } from "@/types";

export type Permission =
  | "browse"
  | "reportIssue"
  | "submitSuggestion"
  | "joinActivity"
  | "answerSurvey"
  | "comment"
  | "rateIssue"
  | "followProject"
  | "submitResearch"
  | "reviewContent"
  | "manageIssues"
  | "viewAdmin";

const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.Visitor]: ["browse"],
  [UserRole.Resident]: [
    "browse",
    "reportIssue",
    "submitSuggestion",
    "joinActivity",
    "answerSurvey",
    "comment",
    "rateIssue",
    "followProject",
  ],
  [UserRole.Collaborator]: [
    "browse",
    "submitSuggestion",
    "joinActivity",
    "comment",
    "followProject",
    "submitResearch",
  ],
  [UserRole.Admin]: [
    "browse",
    "reportIssue",
    "submitSuggestion",
    "joinActivity",
    "answerSurvey",
    "comment",
    "rateIssue",
    "followProject",
    "submitResearch",
    "reviewContent",
    "manageIssues",
    "viewAdmin",
  ],
};

export function can(role: UserRole, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function roleHomePath(role: UserRole) {
  if (role === UserRole.Admin) return "/admin";
  if (role === UserRole.Collaborator) return "/research";
  if (role === UserRole.Resident) return "/profile";
  return "/";
}
