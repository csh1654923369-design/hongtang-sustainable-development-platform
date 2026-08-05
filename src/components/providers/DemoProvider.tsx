"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { issueService } from "@/services/issues";
import { contentService } from "@/services/content";
import {
  CommunityResource,
  IssueReport,
  IssueStatus,
  MicroAction,
  MicroActionStatus,
  NewCommunityResourceInput,
  NewIssueInput,
  NewMicroActionInput,
  UserRole,
} from "@/types";
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
  microActions: MicroAction[];
  submitMicroAction: (input: NewMicroActionInput) => MicroAction;
  updateMicroActionStatus: (id: string, status: MicroActionStatus, facilitator: string, note?: string) => void;
  joinedMicroActionIds: string[];
  joinMicroAction: (id: string) => void;
  communityResources: CommunityResource[];
  submitCommunityResource: (input: NewCommunityResourceInput) => CommunityResource;
  resourceInterestIds: string[];
  signalResourceInterest: (id: string) => void;
  notify: (title: string, description?: string, tone?: "success" | "info") => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(UserRole.Visitor);
  const [issues, setIssues] = useState<IssueReport[]>(() => issueService.list());
  const [joinedActivityIds, setJoinedActivityIds] = useState<string[]>([]);
  const [followedProjectIds, setFollowedProjectIds] = useState<string[]>([]);
  const [microActions, setMicroActions] = useState<MicroAction[]>(() => contentService.getMicroActions());
  const [joinedMicroActionIds, setJoinedMicroActionIds] = useState<string[]>([]);
  const [communityResources, setCommunityResources] = useState<CommunityResource[]>(() => contentService.getCommunityResources());
  const [resourceInterestIds, setResourceInterestIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const issueSequence = useRef(13);
  const microActionSequence = useRef(3);
  const resourceSequence = useRef(7);
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
      notify("记录已暂存", `${issue.code} 仅保存在当前浏览器会话。`, "success");
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

  const submitMicroAction = useCallback(
    (input: NewMicroActionInput) => {
      const sequence = microActionSequence.current++;
      const date = new Date().toISOString().slice(0, 10);
      const action: MicroAction = {
        id: `micro-action-local-${sequence}`,
        isDemo: true,
        code: `HTA-2026-${String(sequence).padStart(4, "0")}`,
        ...input,
        status: MicroActionStatus.Pending,
        initiator: role === UserRole.Collaborator ? "当前协作者" : role === UserRole.Admin ? "当前管理员" : "当前村民",
        facilitator: "待平台匹配行动协调员",
        submittedByMe: true,
        createdAt: date,
        participantCount: 1,
        updates: [
          {
            id: `micro-action-local-${sequence}-u1`,
            isDemo: true,
            date,
            title: "微行动已提交",
            content: "平台将只核对安全、权限、隐私和资源冲突，不代替发起人决定行动内容。",
            author: "当前发起人",
          },
        ],
      };
      setMicroActions((current) => [action, ...current]);
      notify("微行动已提交", `${action.code} 已进入轻量核对，可在“我的行动”查看。`, "success");
      return action;
    },
    [notify, role],
  );

  const updateMicroActionStatus = useCallback(
    (id: string, status: MicroActionStatus, facilitator: string, note?: string) => {
      const date = new Date().toISOString().slice(0, 10);
      setMicroActions((current) => current.map((action) => action.id === id ? {
        ...action,
        status,
        facilitator: facilitator || action.facilitator,
        updates: [...action.updates, { id: `${action.id}-u${action.updates.length + 1}`, isDemo: true, date, title: status === MicroActionStatus.Recruiting ? "轻量核对通过，开放招募" : `行动状态已更新`, content: note || "管理员完成了安全、权限、隐私与资源冲突核对。", author: "平台行动协调员" }],
      } : action));
      notify("微行动状态已更新", status === MicroActionStatus.Recruiting ? "行动现已开放招募伙伴和资源。" : "行动时间线已同步记录。", "success");
    },
    [notify],
  );

  const joinMicroAction = useCallback(
    (id: string) => {
      if (joinedMicroActionIds.includes(id)) return;
      setJoinedMicroActionIds((current) => [...current, id]);
      setMicroActions((actions) => actions.map((action) => action.id === id ? { ...action, participantCount: action.participantCount + 1 } : action));
      notify("已加入行动小组", "行动已加入“我的行动”，后续可查看下一步安排。", "success");
    },
    [joinedMicroActionIds, notify],
  );

  const submitCommunityResource = useCallback(
    (input: NewCommunityResourceInput) => {
      const sequence = resourceSequence.current++;
      const resource: CommunityResource = {
        id: `resource-local-${sequence}`,
        isDemo: true,
        ...input,
        contactLabel: "回应后由平台代为转达，不公开个人联系方式",
        status: "open",
        updatedAt: new Date().toISOString().slice(0, 10),
        submittedByMe: true,
      };
      setCommunityResources((current) => [resource, ...current]);
      notify(input.mode === "offer" ? "资源已登记" : "需求已发布", "公开页面只显示模糊位置和授权字段。", "success");
      return resource;
    },
    [notify],
  );

  const signalResourceInterest = useCallback(
    (id: string) => {
      setResourceInterestIds((current) => {
        if (current.includes(id)) return current;
        notify("回应已记录", "平台会在演示流程中代为转达，不公开个人联系方式。", "success");
        return [...current, id];
      });
    },
    [notify],
  );

  const value = useMemo(
    () => ({ role, setRole, issues, submitIssue, updateIssueStatus, rateIssue, joinedActivityIds, joinActivity, followedProjectIds, toggleFollowProject, microActions, submitMicroAction, updateMicroActionStatus, joinedMicroActionIds, joinMicroAction, communityResources, submitCommunityResource, resourceInterestIds, signalResourceInterest, notify }),
    [role, setRole, issues, submitIssue, updateIssueStatus, rateIssue, joinedActivityIds, joinActivity, followedProjectIds, toggleFollowProject, microActions, submitMicroAction, updateMicroActionStatus, joinedMicroActionIds, joinMicroAction, communityResources, submitCommunityResource, resourceInterestIds, signalResourceInterest, notify],
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
