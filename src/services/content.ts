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

export const contentService = {
  getRoles: () => roles.map((role) => ({ ...role })),
  getVillageProfile: () => ({ ...villageProfile }),
  getGoals: () => goals.map((goal) => ({ ...goal })),
  getGoal: (id: string) => goals.find((goal) => goal.id === id),
  getMapFeatures: () => mapFeatures.map((feature) => ({ ...feature })),
  getSurveys: () => surveys.map((survey) => ({ ...survey, options: [...survey.options] })),
  getSuggestions: () => suggestions.map((suggestion) => ({ ...suggestion })),
  getResearchSubmissions: () => researchSubmissions.map((submission) => ({ ...submission })),
  getNotifications: () => notifications.map((notification) => ({ ...notification })),
  getAuditLogs: () => auditLogs.map((log) => ({ ...log })),
  getVillageTimeline: () => villageTimeline.map((item) => ({ ...item })),
  getVillageStories: () => villageStories.map((item) => ({ ...item })),
};
