import { activities } from "@/data/mockData";

export const activityService = {
  list() {
    return activities.map((activity) => ({ ...activity }));
  },

  getById(id: string) {
    const activity = activities.find((item) => item.id === id);
    return activity ? { ...activity } : undefined;
  },
};
