import { indicators } from "@/data/mockData";

export const indicatorService = {
  list() {
    return indicators.map((indicator) => ({ ...indicator, records: [...indicator.records] }));
  },

  getById(id: string) {
    const indicator = indicators.find((item) => item.id === id);
    return indicator ? { ...indicator, records: [...indicator.records] } : undefined;
  },

  listByGoal(goalId: string) {
    return indicators.filter((indicator) => indicator.goalId === goalId);
  },
};
