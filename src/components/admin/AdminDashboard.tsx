"use client";

import { Activity, BarChart3, CheckCircle2, ChevronRight, ClipboardCheck, Download, FileCheck2, FolderKanban, Gauge, LayoutDashboard, MessageSquare, ScrollText, ShieldCheck, Sparkles, UsersRound, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { can } from "@/lib/permissions";
import { issueStatusLabels, microActionStatusLabels, reviewStatusLabels } from "@/lib/utils";
import { contentService } from "@/services/content";
import { activityService } from "@/services/activities";
import { indicatorService } from "@/services/indicators";
import { projectService } from "@/services/projects";
import { IssueStatus, MicroActionStatus, ReviewStatus, UserRole } from "@/types";

const sections = [
  { id: "overview", label: "数据概览", icon: LayoutDashboard },
  { id: "issues", label: "问题上报", icon: ClipboardCheck },
  { id: "micro-actions", label: "微行动核对", icon: Sparkles },
  { id: "projects", label: "项目管理", icon: FolderKanban },
  { id: "activities", label: "活动管理", icon: Activity },
  { id: "indicators", label: "指标管理", icon: Gauge },
  { id: "map-review", label: "地图数据审核", icon: ShieldCheck },
  { id: "research", label: "调研成果审核", icon: FileCheck2 },
  { id: "comments", label: "评论与建议", icon: MessageSquare },
  { id: "users", label: "用户与角色", icon: UsersRound },
  { id: "logs", label: "操作日志", icon: ScrollText },
];

export function AdminDashboard() {
  const { role, setRole, issues, updateIssueStatus, microActions, updateMicroActionStatus, communityResources, notify } = useDemo();
  const [section, setSection] = useState("overview");
  const [selectedIssueId, setSelectedIssueId] = useState(issues[0]?.id ?? "");
  const [status, setStatus] = useState<IssueStatus>(IssueStatus.Accepted);
  const [assignee, setAssignee] = useState("村庄环境维护人员");
  const [note, setNote] = useState("");
  const [selectedActionId, setSelectedActionId] = useState(microActions[0]?.id ?? "");
  const [actionStatus, setActionStatus] = useState<MicroActionStatus>(MicroActionStatus.Pending);
  const [actionFacilitator, setActionFacilitator] = useState("平台行动协调员");
  const [actionNote, setActionNote] = useState("");
  const [researchStatuses, setResearchStatuses] = useState<Record<string, ReviewStatus>>({});
  const selectedIssue = issues.find((item) => item.id === selectedIssueId);
  const selectedAction = microActions.find((item) => item.id === selectedActionId);
  const research = contentService.getResearchSubmissions();
  const projects = projectService.list();
  const activities = activityService.list();
  const indicators = indicatorService.list();
  const logs = contentService.getAuditLogs();
  const stats = useMemo(() => ({ pending: issues.filter((item) => item.status === IssueStatus.Pending).length, pendingActions: microActions.filter((item) => item.status === MicroActionStatus.Pending).length, processing: issues.filter((item) => [IssueStatus.Accepted, IssueStatus.Assigned, IssueStatus.Processing].includes(item.status)).length, research: research.filter((item) => (researchStatuses[item.id] ?? item.status) === ReviewStatus.Pending).length }), [issues, microActions, research, researchStatuses]);

  if (!can(role, "viewAdmin")) return <section className="access-gate"><ShieldCheck size={42} /><DemoDataBadge /><h2>管理员后台仅对管理角色开放</h2><p>切换后可以演示问题受理、责任分派、状态更新和调研成果审核。</p><button className="button button-admin" onClick={() => setRole(UserRole.Admin)}>切换为管理员并进入</button></section>;

  const saveIssue = () => {
    if (!selectedIssue) return;
    updateIssueStatus(selectedIssue.id, status, assignee, note || "管理员通过后台更新了办理状态。" );
    setNote("");
  };
  const saveAction = () => {
    if (!selectedAction) return;
    updateMicroActionStatus(selectedAction.id, actionStatus, actionFacilitator, actionNote || "已完成安全、权限、隐私与资源冲突的轻量核对。" );
    setActionNote("");
  };
  const review = (id: string, next: ReviewStatus) => { setResearchStatuses((current) => ({ ...current, [id]: next })); notify("审核状态已更新", `当前结果：${reviewStatusLabels[next]}`, "success"); };
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), demo: true, issues, microActions, communityResources, projects, indicators }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "hongtang-demo-export.json"; anchor.click(); URL.revokeObjectURL(url); notify("演示数据已导出", "JSON 文件不包含真实村庄或个人数据。", "success");
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar"><div className="admin-brand"><span className="brand-seal">红</span><div><strong>平台管理后台</strong><small>DEMO CONSOLE</small></div></div><nav>{sections.map((item) => { const Icon = item.icon; const badge = item.id === "issues" ? stats.pending : item.id === "micro-actions" ? stats.pendingActions : 0; return <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}><Icon size={18} />{item.label}{badge ? <span>{badge}</span> : null}</button>; })}</nav><button className="button button-secondary export-button" onClick={exportData}><Download size={17} />导出演示数据</button></aside>
      <section className="admin-content"><div className="admin-topbar"><div><DemoDataBadge /><span>当前身份：平台管理员</span></div><button className="button button-secondary" onClick={() => setRole(UserRole.Resident)}>退出管理视图</button></div>
        {section === "overview" ? <div><div className="admin-title"><h1>数据概览</h1><p>今天需要优先处理的演示事项。</p></div><div className="admin-stat-grid"><article><ClipboardCheck size={22} /><span>待审核问题</span><strong>{stats.pending}</strong><small>需要确认位置与分类</small></article><article><Sparkles size={22} /><span>待核对微行动</span><strong>{stats.pendingActions}</strong><small>只核对安全、权限与隐私</small></article><article><BarChart3 size={22} /><span>处理中问题</span><strong>{stats.processing}</strong><small>包含已受理与已分派</small></article><article><FileCheck2 size={22} /><span>待审核调研成果</span><strong>{stats.research}</strong><small>检查来源、授权与重复</small></article><article><Activity size={22} /><span>活动报名人次</span><strong>57</strong><small>近期开放活动</small></article><article><CheckCircle2 size={22} /><span>项目平均完成率</span><strong>56%</strong><small>5 个演示项目</small></article></div><div className="admin-overview-grid"><section className="admin-panel"><div className="card-heading"><h2>待办问题</h2><button onClick={() => setSection("issues")}>全部问题 <ChevronRight size={15} /></button></div>{issues.filter((item) => item.status === IssueStatus.Pending).map((issue) => <button className="admin-list-row" key={issue.id} onClick={() => { setSelectedIssueId(issue.id); setSection("issues"); }}><div><strong>{issue.title}</strong><span>{issue.code} · {issue.type}</span></div><StatusBadge status={issue.status} /><ChevronRight size={17} /></button>)}</section><section className="admin-panel"><div className="card-heading"><h2>最近操作</h2><button onClick={() => setSection("logs")}>查看日志 <ChevronRight size={15} /></button></div>{logs.slice(0, 4).map((log) => <div className="log-row" key={log.id}><span>{log.createdAt}</span><strong>{log.actor}</strong><p>{log.action} · {log.target}</p></div>)}</section></div></div> : null}

        {section === "issues" ? <div><div className="admin-title"><h1>问题上报处理</h1><p>审核问题、分派责任人并记录办理说明。</p></div><div className="admin-issue-layout"><div className="admin-panel admin-issue-list">{issues.map((issue) => <button className={issue.id === selectedIssueId ? "active" : ""} onClick={() => { setSelectedIssueId(issue.id); setStatus(issue.status); setAssignee(issue.assignee ?? "村庄环境维护人员"); }} key={issue.id}><div><span>{issue.code}</span><strong>{issue.title}</strong><small>{issue.location}</small></div><StatusBadge status={issue.status} /></button>)}</div>{selectedIssue ? <div className="admin-panel issue-processor"><div className="inline-badges"><DemoDataBadge /><span className="soft-tag">{selectedIssue.type}</span></div><h2>{selectedIssue.title}</h2><p>{selectedIssue.description}</p><dl className="processor-facts"><div><dt>位置</dt><dd>{selectedIssue.location}</dd></div><div><dt>提交时间</dt><dd>{selectedIssue.submittedAt}</dd></div><div><dt>当前状态</dt><dd>{issueStatusLabels[selectedIssue.status]}</dd></div></dl><label className="field-label">修改办理状态<select className="select-input" value={status} onChange={(event) => setStatus(event.target.value as IssueStatus)}>{Object.values(IssueStatus).map((item) => <option value={item} key={item}>{issueStatusLabels[item]}</option>)}</select></label><label className="field-label">分派责任人<select className="select-input" value={assignee} onChange={(event) => setAssignee(event.target.value)}><option>村庄环境维护人员</option><option>设施维护人员</option><option>项目协调小组</option><option>公共服务工作组</option><option>文化资料小组</option></select></label><label className="field-label">处理说明<textarea className="text-area" value={note} onChange={(event) => setNote(event.target.value)} placeholder="说明核实情况、下一步安排或处理结果……" /></label><div className="processor-actions"><button className="button button-secondary" onClick={() => { setStatus(IssueStatus.Rejected); setNote("信息仍需核实，当前暂不受理。" ); }}>标记暂不受理</button><button className="button button-primary" onClick={saveIssue}>保存办理更新</button></div></div> : null}</div></div> : null}

        {section === "micro-actions" ? <div><div className="admin-title"><h1>微行动轻量核对</h1><p>只检查安全、权限、隐私和资源冲突，不替发起人决定行动内容。</p></div><div className="admin-issue-layout"><div className="admin-panel admin-issue-list">{microActions.map((action) => <button className={action.id === selectedActionId ? "active" : ""} onClick={() => { setSelectedActionId(action.id); setActionStatus(action.status); setActionFacilitator(action.facilitator); }} key={action.id}><div><span>{action.code}</span><strong>{action.title}</strong><small>{action.location} · {action.durationDays} 天</small></div><span className={`micro-action-status status-${action.status}`}>{microActionStatusLabels[action.status]}</span></button>)}</div>{selectedAction ? <div className="admin-panel issue-processor action-processor"><div className="inline-badges"><DemoDataBadge label="社区微行动" /><span className="soft-tag">{selectedAction.initiator}</span></div><h2>{selectedAction.title}</h2><p>{selectedAction.summary}</p><dl className="processor-facts"><div><dt>已有资源</dt><dd>{selectedAction.existingAssets.join("、")}</dd></div><div><dt>仍需资源</dt><dd>{selectedAction.neededResources.join("、")}</dd></div><div><dt>第一次行动</dt><dd>{selectedAction.nextStep}</dd></div></dl><label className="field-label">行动状态<select className="select-input" value={actionStatus} onChange={(event) => setActionStatus(event.target.value as MicroActionStatus)}>{Object.values(MicroActionStatus).map((item) => <option value={item} key={item}>{microActionStatusLabels[item]}</option>)}</select></label><label className="field-label">匹配行动协调员<select className="select-input" value={actionFacilitator} onChange={(event) => setActionFacilitator(event.target.value)}><option>平台行动协调员</option><option>环境行动联络员</option><option>公共服务工作组联络员</option><option>文化资料小组联络员</option></select></label><label className="field-label">核对说明<textarea className="text-area" value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder="说明安全边界、公开范围、资源冲突或需要补充的内容……" /></label><div className="processor-actions"><button className="button button-secondary" onClick={() => { setActionStatus(MicroActionStatus.Pending); setActionNote("请补充第一次行动的时间边界或维护安排。" ); }}>要求补充</button><button className="button button-primary" onClick={() => { setActionStatus(MicroActionStatus.Recruiting); setActionNote("已完成轻量核对，可以公开招募伙伴与资源。" ); }}>通过并开放招募</button><button className="button button-primary" onClick={saveAction}>保存更新</button></div></div> : null}</div></div> : null}

        {section === "research" || section === "map-review" ? <div><div className="admin-title"><h1>{section === "research" ? "调研成果审核" : "地图数据审核"}</h1><p>对照提交内容与审核意见，决定是否进入正式资料库。</p></div><div className="review-list">{research.map((item) => { const currentStatus = researchStatuses[item.id] ?? item.status; return <article className="admin-panel" key={item.id}><div className="review-submission"><span className="research-type">{item.type}</span><DemoDataBadge /><h3>{item.title}</h3><p>{item.description}</p><dl><div><dt>调研人员</dt><dd>{item.researchers}</dd></div><div><dt>调研位置</dt><dd>{item.location}</dd></div><div><dt>数据来源</dt><dd>{item.source}</dd></div></dl></div><div className="review-controls"><StatusBadge status={currentStatus} /><label className="field-label">审核意见<textarea className="text-area" defaultValue={item.reviewNote ?? "资料来源与公开范围已检查。"} /></label><div><button onClick={() => review(item.id, ReviewStatus.Approved)}><CheckCircle2 size={17} />通过</button><button onClick={() => review(item.id, ReviewStatus.Revision)}>退回修改</button><button onClick={() => review(item.id, ReviewStatus.Duplicate)}>标记重复</button><button onClick={() => review(item.id, ReviewStatus.Rejected)}><XCircle size={17} />拒绝</button></div></div></article>; })}</div></div> : null}

        {section === "projects" ? <GenericAdminPanel title="项目管理" description="创建项目、更新进度与维护参与信息。" rows={projects.map((item) => ({ title: item.title, meta: `${item.type} · 进度 ${item.progress}%`, status: item.status }))} onAction={() => notify("项目编辑器已打开", "Demo 中使用模拟反馈，未来接入 Supabase 项目表。" )} /> : null}
        {section === "activities" ? <GenericAdminPanel title="活动管理" description="发布活动、调整名额并查看报名情况。" rows={activities.map((item) => ({ title: item.title, meta: `${item.date} · 已报名 ${item.registered}/${item.capacity}`, status: item.status }))} onAction={() => notify("活动编辑器已打开", "Demo 中未写入真实报名数据。" )} /> : null}
        {section === "indicators" ? <GenericAdminPanel title="指标管理" description="更新指标值、来源、时间和数据完整度。" rows={indicators.map((item) => ({ title: item.name, meta: `${item.value}${item.unit} · 完整度 ${item.completeness}%`, status: item.updatedAt }))} onAction={() => notify("指标编辑器已打开", "正式版本会保留每次数据更新记录。" )} /> : null}
        {section === "comments" ? <GenericAdminPanel title="评论与建议" description="查看公开讨论、管理员回应和不当内容标记。" rows={contentService.getSuggestions().map((item) => ({ title: item.title, meta: `${item.supportCount} 人支持 · ${item.submittedAt}`, status: item.status }))} onAction={() => notify("内容管理操作已记录", "这是模拟操作，不会删除真实内容。", "success")} /> : null}
        {section === "users" ? <GenericAdminPanel title="用户与角色" description="查看角色分布与权限范围，Demo 不包含真实账户信息。" rows={[{ title: "游客", meta: "无需登录 · 仅浏览", status: "公开访问" }, { title: "村民", meta: "上报、报名、评价", status: "模拟角色" }, { title: "学生 / 规划协作者", meta: "提交调研成果", status: "模拟角色" }, { title: "管理员 / 村委", meta: "审核与维护", status: "模拟角色" }]} onAction={() => notify("角色说明已打开")} /> : null}
        {section === "logs" ? <GenericAdminPanel title="操作日志" description="记录关键审核、状态和数据更新操作。" rows={logs.map((item) => ({ title: `${item.actor} · ${item.action}`, meta: item.target, status: item.createdAt }))} onAction={() => notify("日志详情已打开")} /> : null}
      </section>
    </div>
  );
}

function GenericAdminPanel({ title, description, rows, onAction }: { title: string; description: string; rows: Array<{ title: string; meta: string; status: string }>; onAction: () => void }) {
  return <div><div className="admin-title"><h1>{title}</h1><p>{description}</p></div><section className="admin-panel generic-admin-table"><div className="generic-table-head"><span>内容</span><span>信息</span><span>状态</span><span>操作</span></div>{rows.map((row, index) => <div className="generic-table-row" key={`${row.title}-${index}`}><strong>{row.title}</strong><span>{row.meta}</span><span className="status-badge">{row.status}</span><button onClick={onAction}>查看 / 编辑</button></div>)}</section></div>;
}
