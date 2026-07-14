"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { issueService } from "@/services/issues";
import { IssueReport, IssueStatus, NewIssueInput, UserRole } from "@/types";
import { roleLabels } from "@/lib/utils";
import { ToastMessage, ToastNotification } from "@/components/common/ToastNotification";

interface DemoContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  issues: IssueReport[];
  submitIssue: (input: NewIssueInput) => IssueReport;
  updateIssueStatus: (id: string, status: IssueStatus, assignee?: string, note?: string) => void;
  rateIssue: (id: string, rating: number, comment: string) => void;
  joinedActivityIds: string[];
  joinActivity: (id: string) => void;
  followedProjectIds: string[];
  toggleFollowProject: (id: string) => void;
  notify: (title: string, description?: string, tone?: "success" | "info") => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(UserRole.Visitor);
  const [issues, setIssues] = useState<IssueReport[]>(() => issueService.list());
  const [joinedActivityIds, setJoinedActivityIds] = useState<string[]>([]);
  const [followedProjectIds, setFollowedProjectIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const issueSequence = useRef(13);
  const toastSequence = useRef(1);

  const notify = useCallback((title: string, description?: string, tone: "success" | "info" = "info") => {
    const id = toastSequence.current++;
    setToast({ id, title, description, tone });
    window.setTimeout(() => setToast((current) => (current?.id === id ? null : current)), 3600);
  }, []);

  const setRole = useCallback(
    (nextRole: UserRole) => {
      setRoleState(nextRole);
      notify(`已切换为${roleLabels[nextRole]}`, "页面操作权限已同步更新。", "success");
    },
    [notify],
  );

  const submitIssue = useCallback(
    (input: NewIssueInput) => {
      const issue = issueService.createLocal(input, issueSequence.current++);
      setIssues((current) => [issue, ...current]);
      notify("问题上报成功", `${issue.code} 已进入待审核状态。`, "success");
      return issue;
    },
    [notify],
  );

  const updateIssueStatus = useCallback(
    (id: string, status: IssueStatus, assignee?: string, note?: string) => {
      const date = new Date().toISOString().slice(0, 10);
      setIssues((current) =>
        current.map((issue) =>
          issue.id === id
            ? {
                ...issue,
                status,
                assignee: assignee || issue.assignee,
                updatedAt: date,
                history: [
                  ...issue.history,
                  {
                    id: `${issue.id}-history-${issue.history.length + 1}`,
                    isDemo: true,
                    date,
                    status,
                    title: `状态更新为${status}`,
                    description: note || "管理员更新了问题办理状态。",
                    operator: "平台管理员",
                  },
                ],
              }
            : issue,
        ),
      );
      notify("办理状态已更新", "问题时间线已同步记录。", "success");
    },
    [notify],
  );

  const rateIssue = useCallback(
    (id: string, rating: number, comment: string) => {
      const date = new Date().toISOString().slice(0, 10);
      setIssues((current) =>
        current.map((issue) =>
          issue.id === id
            ? {
                ...issue,
                rating,
                status: IssueStatus.Rated,
                updatedAt: date,
                history: [
                  ...issue.history,
                  {
                    id: `${issue.id}-rating`,
                    isDemo: true,
                    date,
                    status: IssueStatus.Rated,
                    title: "村民已评价",
                    description: comment || "村民已完成满意度评价。",
                    operator: "当前村民",
                  },
                ],
              }
            : issue,
        ),
      );
      notify("感谢你的评价", "评价结果已记录为演示数据。", "success");
    },
    [notify],
  );

  const joinActivity = useCallback(
    (id: string) => {
      setJoinedActivityIds((current) => (current.includes(id) ? current : [...current, id]));
      notify("报名成功", "活动已加入“我的活动”。", "success");
    },
    [notify],
  );

  const toggleFollowProject = useCallback(
    (id: string) => {
      setFollowedProjectIds((current) => {
        const followed = current.includes(id);
        notify(followed ? "已取消关注" : "已关注项目", followed ? "你将不再接收该项目的模拟更新。" : "项目已加入“我的关注”。", "success");
        return followed ? current.filter((item) => item !== id) : [...current, id];
      });
    },
    [notify],
  );

  const value = useMemo(
    () => ({ role, setRole, issues, submitIssue, updateIssueStatus, rateIssue, joinedActivityIds, joinActivity, followedProjectIds, toggleFollowProject, notify }),
    [role, setRole, issues, submitIssue, updateIssueStatus, rateIssue, joinedActivityIds, joinActivity, followedProjectIds, toggleFollowProject, notify],
  );

  return (
    <DemoContext.Provider value={value}>
      {children}
      {toast ? <ToastNotification toast={toast} onClose={() => setToast(null)} /> : null}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used within DemoProvider");
  return context;
}
