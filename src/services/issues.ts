import { issues } from "@/data/mockData";
import { IssueReport, IssueStatus, NewIssueInput, UserRole } from "@/types";

export const issueService = {
  list(): IssueReport[] {
    return issues.map((issue) => ({ ...issue, history: [...issue.history] }));
  },

  getById(id: string): IssueReport | undefined {
    const issue = issues.find((item) => item.id === id || item.code === id);
    return issue ? { ...issue, history: [...issue.history] } : undefined;
  },

  createLocal(input: NewIssueInput, sequence: number): IssueReport {
    const date = new Date().toISOString().slice(0, 10);
    const padded = String(sequence).padStart(4, "0");
    const id = `local-issue-${sequence}`;
    return {
      id,
      isDemo: true,
      code: `HT-2026-${padded}`,
      ...input,
      status: IssueStatus.Pending,
      submitterType: UserRole.Resident,
      submittedAt: date,
      updatedAt: date,
      goalId: input.type === "水体环境" || input.type === "绿化问题" ? "goal-ecology" : "goal-livable",
      history: [
        {
          id: `${id}-history-1`,
          isDemo: true,
          date,
          status: IssueStatus.Pending,
          title: "问题已提交",
          description: "演示上报已保存到当前浏览器会话，等待平台审核。",
          operator: "当前村民",
        },
      ],
    };
  },
};
