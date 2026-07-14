"use client";

import { Bell, BellOff, Lightbulb, Send, Vote } from "lucide-react";
import { FormEvent, useState } from "react";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";

export function ProjectActions({ projectId }: { projectId: string }) {
  const { role, followedProjectIds, toggleFollowProject, notify } = useDemo();
  const [suggestion, setSuggestion] = useState("");
  const [vote, setVote] = useState<string | null>(null);
  const followed = followedProjectIds.includes(projectId);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!can(role, "submitSuggestion")) { notify("请切换为村民或协作者", "游客可以查看公开建议，但不能提交。" ); return; }
    if (suggestion.trim().length < 6) { notify("请再具体一些", "建议内容至少需要 6 个字。" ); return; }
    setSuggestion("");
    notify("建议已提交", "内容将以演示数据进入待回应状态。", "success");
  };
  const chooseVote = (value: string) => {
    if (!can(role, "comment")) { notify("请切换身份后参与投票", "游客可以查看方案，但不能提交投票。" ); return; }
    setVote(value); notify("投票已记录", `你选择了${value}，结果仅用于演示。`, "success");
  };
  return (
    <section className="content-card project-participation"><div className="card-heading"><h2>公众参与</h2><span>你的意见将进入演示流程</span></div><div className="participation-actions"><button className={`button ${followed ? "button-secondary" : "button-primary"}`} onClick={() => toggleFollowProject(projectId)}>{followed ? <BellOff size={17} /> : <Bell size={17} />}{followed ? "取消关注" : "关注项目"}</button><a className="button button-secondary" href="#activity"><Vote size={17} />报名相关活动</a></div><div className="project-vote"><strong>你更支持哪一种共创推进方式？</strong><div><button className={vote === "方案 A：先做临时样段" ? "active" : ""} onClick={() => chooseVote("方案 A：先做临时样段")}>方案 A：先做临时样段</button><button className={vote === "方案 B：先完善整体设计" ? "active" : ""} onClick={() => chooseVote("方案 B：先完善整体设计")}>方案 B：先完善整体设计</button></div></div><form onSubmit={submit}><label className="field-label"><span><Lightbulb size={17} />提交项目建议</span><textarea className="text-area" value={suggestion} onChange={(event) => setSuggestion(event.target.value)} placeholder="请说明你关注的使用场景或改进建议……" /></label><button className="button button-primary" type="submit"><Send size={17} />提交建议</button></form></section>
  );
}
