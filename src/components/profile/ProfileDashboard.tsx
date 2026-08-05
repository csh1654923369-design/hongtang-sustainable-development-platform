"use client";

import Link from "next/link";
import { Bell, Bookmark, CalendarDays, ChevronRight, ClipboardList, FileCheck2, MessageSquare, Sparkles, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { contentService } from "@/services/content";
import { activityService } from "@/services/activities";
import { projectService } from "@/services/projects";
import { roleLabels } from "@/lib/utils";
import { UserRole } from "@/types";
import { MicroActionCard } from "@/components/actions/MicroActionCard";

type Tab = "actions" | "suggestions" | "activities" | "surveys" | "comments" | "following" | "research" | "notifications";

export function ProfileDashboard() {
  const { role, setRole, joinedActivityIds, followedProjectIds, microActions, joinedMicroActionIds } = useDemo();
  const [tab, setTab] = useState<Tab>(role === UserRole.Collaborator ? "research" : "actions");
  const activities = activityService.list().filter((item) => joinedActivityIds.includes(item.id));
  const projects = projectService.list().filter((item) => followedProjectIds.includes(item.id));
  const research = contentService.getResearchSubmissions();
  const notifications = contentService.getNotifications();
  const myActions = useMemo(() => microActions.filter((action) => action.submittedByMe || joinedMicroActionIds.includes(action.id)), [microActions, joinedMicroActionIds]);

  if (role === UserRole.Visitor) return <section className="access-gate"><UserRound size={42} /><DemoDataBadge /><h2>个人中心需要一个演示身份</h2><p>切换为村民可以查看上报和报名；切换为协作者可以查看调研审核状态。</p><div><button className="button button-primary" onClick={() => setRole(UserRole.Resident)}>以村民身份进入</button><button className="button button-secondary" onClick={() => setRole(UserRole.Collaborator)}>以协作者身份进入</button></div></section>;

  const tabs = [
    { id: "actions" as const, label: "我的行动", icon: Sparkles, roles: [UserRole.Resident, UserRole.Collaborator, UserRole.Admin] },
    { id: "suggestions" as const, label: "我的建议", icon: MessageSquare, roles: [UserRole.Resident, UserRole.Collaborator, UserRole.Admin] },
    { id: "activities" as const, label: "我的活动", icon: CalendarDays, roles: [UserRole.Resident, UserRole.Collaborator, UserRole.Admin] },
    { id: "surveys" as const, label: "我的问卷", icon: ClipboardList, roles: [UserRole.Resident, UserRole.Admin] },
    { id: "following" as const, label: "我的关注", icon: Bookmark, roles: [UserRole.Resident, UserRole.Collaborator, UserRole.Admin] },
    { id: "research" as const, label: "调研提交", icon: FileCheck2, roles: [UserRole.Collaborator, UserRole.Admin] },
    { id: "notifications" as const, label: "消息通知", icon: Bell, roles: [UserRole.Resident, UserRole.Collaborator, UserRole.Admin] },
  ].filter((item) => item.roles.includes(role));

  const activeTab = tabs.some((item) => item.id === tab) ? tab : tabs[0].id;
  return (
    <div className="profile-layout">
      <aside className="profile-sidebar"><div className="profile-card"><span className="profile-avatar">{roleLabels[role][0]}</span><strong>{roleLabels[role]}</strong><small>演示账户</small><DemoDataBadge /></div><nav>{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} data-testid={item.id === "actions" ? "profile-tab-actions" : undefined} className={activeTab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><Icon size={18} />{item.label}<ChevronRight size={15} /></button>; })}</nav>{role === UserRole.Admin ? <Link href="/admin" className="button button-admin">进入管理员后台</Link> : null}</aside>
      <section className="profile-content">
        {activeTab === "actions" ? <div data-testid="profile-micro-actions"><div className="tab-heading"><div><h2>我的行动</h2><p>查看我发起或加入的微行动、资源需求与下一步安排。</p></div><Link className="button button-primary" href="/actions/new">发起小行动</Link></div>{myActions.length ? <div className="profile-action-list">{myActions.map((action) => <MicroActionCard action={action} compact key={action.id} />)}</div> : <div className="inline-empty">尚未发起或加入行动。可以先从一个 30 天的小试验开始。<Link href="/projects#micro-actions">浏览社区微行动</Link></div>}</div> : null}
        {activeTab === "suggestions" ? <div><div className="tab-heading"><div><h2>我的建议</h2><p>展示当前演示账户提出的建议与回应状态。</p></div><Link href="/participate" className="button button-primary">提出建议</Link></div><div className="simple-record-list"><article><strong>活动通知增加大字版</strong><span className="status-badge">已回应</span><p>管理员：已制作演示版大字号模板。</p></article><article><strong>地图增加无障碍设施分类</strong><span className="status-badge">待回应</span><p>提交于 2026-07-06 · 演示数据</p></article></div></div> : null}
        {activeTab === "activities" ? <div><div className="tab-heading"><div><h2>我的活动</h2><p>报名成功的活动会显示在这里。</p></div><Link href="/participate" className="button button-secondary">浏览活动</Link></div>{activities.length ? <div className="simple-record-list">{activities.map((activity) => <article key={activity.id}><strong>{activity.title}</strong><span className="status-badge">已报名</span><p>{activity.date} {activity.time} · {activity.location}</p></article>)}</div> : <div className="inline-empty">尚未报名活动，前往公众参与中心选择一场活动。</div>}</div> : null}
        {activeTab === "surveys" ? <div><div className="tab-heading"><div><h2>我的问卷</h2><p>演示问卷提交记录。</p></div><Link href="/participate" className="button button-secondary">参与问卷</Link></div><div className="simple-record-list"><article><strong>公共空间问题优先度调查</strong><span className="status-badge">已完成</span><p>提交于 2026-07-12 · 回答内容仅为演示数据</p></article></div></div> : null}
        {activeTab === "following" ? <div><div className="tab-heading"><div><h2>我的关注</h2><p>关注项目的更新会出现在消息通知中。</p></div><Link href="/projects" className="button button-secondary">浏览项目</Link></div>{projects.length ? <div className="simple-record-list">{projects.map((project) => <Link href={`/projects/${project.slug}`} key={project.id}><strong>{project.title}</strong><span className="status-badge">进度 {project.progress}%</span><p>更新于 {project.updatedAt}</p></Link>)}</div> : <div className="inline-empty">尚未关注项目。打开任一项目详情即可关注。</div>}</div> : null}
        {activeTab === "research" ? <div><div className="tab-heading"><div><h2>我的调研提交</h2><p>所有空间数据和调研成果都要经过审核才能公开。</p></div><Link href="/research" className="button button-primary">提交新成果</Link></div><div className="research-record-list">{research.map((item) => <article key={item.id}><span className="research-type">{item.type}</span><div><h3>{item.title}</h3><p>{item.surveyDate} · {item.location}</p>{item.reviewNote ? <small>审核意见：{item.reviewNote}</small> : null}</div><StatusBadge status={item.status} /></article>)}</div></div> : null}
        {activeTab === "notifications" ? <div><div className="tab-heading"><div><h2>消息通知</h2><p>问题、项目、活动与审核状态的演示提醒。</p></div></div><div className="notification-list-page">{notifications.map((item) => <Link href={item.href ?? "#"} key={item.id} className={item.read ? "" : "unread"}><span className="notification-icon"><Bell size={18} /></span><div><strong>{item.title}</strong><p>{item.content}</p><small>{item.createdAt}</small></div></Link>)}</div></div> : null}
      </section>
    </div>
  );
}
