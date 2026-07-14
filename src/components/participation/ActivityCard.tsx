"use client";

import { CalendarDays, Clock3, MapPin, UsersRound } from "lucide-react";
import { useState } from "react";
import { Activity } from "@/types";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";

export function ActivityCard({ activity, compact = false }: { activity: Activity; compact?: boolean }) {
  const { role, joinedActivityIds, joinActivity, notify } = useDemo();
  const [open, setOpen] = useState(false);
  const joined = joinedActivityIds.includes(activity.id);
  const available = activity.capacity - activity.registered - (joined ? 1 : 0);
  const requestJoin = () => {
    if (!can(role, "joinActivity")) {
      notify("请先切换为村民或协作者", "游客可以浏览活动，但不能提交正式报名。");
      return;
    }
    setOpen(true);
  };
  return (
    <>
      <article className={`activity-card ${compact ? "compact" : ""}`}>
        <div className="activity-date"><strong>{new Date(activity.date).getDate()}</strong><span>{new Date(activity.date).getMonth() + 1}月</span></div>
        <div className="activity-content"><div className="inline-badges"><DemoDataBadge /><span className={`activity-state ${activity.status}`}>{activity.status === "open" ? "报名中" : activity.status === "full" ? "已满员" : "已结束"}</span></div><h3>{activity.title}</h3><p>{activity.description}</p><div className="activity-meta"><span><CalendarDays size={15} />{activity.date}</span><span><Clock3 size={15} />{activity.time}</span><span><MapPin size={15} />{activity.location}</span><span><UsersRound size={15} />已报名 {activity.registered + (joined ? 1 : 0)} / {activity.capacity}</span></div></div>
        <button className="button button-secondary" disabled={joined || activity.status !== "open"} onClick={requestJoin}>{joined ? "已报名" : activity.status === "open" ? "立即报名" : "活动已结束"}</button>
      </article>
      <ConfirmationDialog open={open} title={`报名：${activity.title}`} description={`活动时间：${activity.date} ${activity.time}，当前剩余 ${available} 个演示名额。`} confirmLabel="确认报名" onClose={() => setOpen(false)} onConfirm={() => { joinActivity(activity.id); setOpen(false); }}>
        <label className="field-label">联系电话（仅演示，不会保存）<input className="text-input" placeholder="请输入联系电话" /></label>
        <label className="check-row"><input type="checkbox" defaultChecked />我已了解活动安排并同意接收演示通知</label>
      </ConfirmationDialog>
    </>
  );
}
