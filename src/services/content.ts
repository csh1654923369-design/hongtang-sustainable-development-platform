import {
  auditLogs,
  goals,
  mapFeatures,
  notifications,
  researchSubmissions,
  roles,
  suggestions,
  surveys,
  villageProfile,
  villageStories,
  villageTimeline,
} from "@/data/mockData";
import { communityResources, microActions } from "@/data/communityData";

export const contentService = {
  getRoles: () => roles.map((role) => ({ ...role })),
  getVillageProfile: () => ({ ...villageProfile }),
  getGoals: () => goals.map((goal) => ({ ...goal })),
  getGoal: (id: string) => goals.find((goal) => goal.id === id),
  getMapFeatures: () => mapFeatures.map((feature) => ({ ...feature })),
  getMicroActions: () => microActions.map((action) => ({ ...action, existingAssets: [...action.existingAssets], neededResources: [...action.neededResources], rolesNeeded: [...action.rolesNeeded], updates: [...action.updates] })),
  getCommunityResources: () => communityResources.map((resource) => ({ ...resource })),
  getSurveys: () => surveys.map((survey) => ({ ...survey, options: [...survey.options] })),
  getSuggestions: () => suggestions.map((suggestion) => ({ ...suggestion })),
  getResearchSubmissions: () => researchSubmissions.map((submission) => ({ ...submission })),
  getNotifications: () => notifications.map((notification) => ({ ...notification })),
  getAuditLogs: () => auditLogs.map((log) => ({ ...log })),
  getVillageTimeline: () => villageTimeline.map((item) => ({ ...item })),
  getVillageStories: () => villageStories.map((item) => ({ ...item })),
};
