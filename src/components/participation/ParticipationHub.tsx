"use client";

import { CheckCircle2, Heart, MessageSquarePlus, Plus, Send, UsersRound, Vote } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Activity, Suggestion, Survey } from "@/types";
import { ActivityCard } from "@/components/participation/ActivityCard";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";

const suggestionLabels = { pending: "待回应", responded: "已回应", discussion: "讨论中", adopted: "已纳入项目", declined: "暂不采纳" };

export function ParticipationHub({ suggestions: initialSuggestions, activities, surveys }: { suggestions: Suggestion[]; activities: Activity[]; surveys: Survey[] }) {
  const { role, notify } = useDemo();
  const [tab, setTab] = useState<"suggestions" | "activities" | "surveys" | "cocreate">("suggestions");
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [supported, setSupported] = useState<string[]>([]);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionTitle, setSuggestionTitle] = useState("");
  const [suggestionText, setSuggestionText] = useState("");
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({});
  const [submittedSurveys, setSubmittedSurveys] = useState<string[]>([]);
  const [cocreateVote, setCocreateVote] = useState("");
  const totalSurveyVotes = useMemo(() => surveys.reduce((total, survey) => total + survey.responses, 0), [surveys]);

  const support = (id: string) => {
    if (!can(role, "submitSuggestion")) { notify("请切换为村民角色后支持建议", "游客可以浏览建议与管理员回应。" ); return; }
    setSupported((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const submitSuggestion = () => {
    if (suggestionTitle.trim().length < 4 || suggestionText.trim().length < 8) { notify("请补充建议内容", "标题至少 4 个字，说明至少 8 个字。" ); return; }
    setSuggestions((current) => [{ id: `suggestion-local-${Date.now()}`, isDemo: true, title: suggestionTitle, content: suggestionText, submittedAt: "刚刚", supportCount: 0, status: "pending" }, ...current]);
    setSuggestionTitle(""); setSuggestionText(""); setSuggestionOpen(false); notify("建议已提交", "管理员回应前将显示为“待回应”。", "success");
  };
  const openSuggestion = () => {
    if (!can(role, "submitSuggestion")) { notify("请切换为村民或协作者", "游客可以查看公开建议，但不能提交。" ); return; }
    setSuggestionOpen(true);
  };
  const submitSurvey = (event: FormEvent, survey: Survey) => {
    event.preventDefault();
    if (!can(role, "answerSurvey")) { notify("请切换为村民角色参与问卷", "游客可以查看问卷题目和模拟结果。" ); return; }
    if (!surveyAnswers[survey.id]) { notify("请选择一个答案", "完成选择后再提交问卷。" ); return; }
    setSubmittedSurveys((current) => [...current, survey.id]); notify("问卷已提交", "下方已显示模拟统计结果。", "success");
  };

  return (
    <div className="participation-hub">
      <div className="participation-tabs" role="tablist"><button className={tab === "suggestions" ? "active" : ""} onClick={() => setTab("suggestions")}><MessageSquarePlus size={18} />村庄建议</button><button className={tab === "activities" ? "active" : ""} onClick={() => setTab("activities")}><UsersRound size={18} />活动报名</button><button className={tab === "surveys" ? "active" : ""} onClick={() => setTab("surveys")}><Vote size={18} />调查问卷</button><button className={tab === "cocreate" ? "active" : ""} onClick={() => setTab("cocreate")}><Heart size={18} />共创讨论</button></div>
      {tab === "suggestions" ? <section><div className="tab-heading"><div><h2>村庄建议</h2><p>具体建议可以获得支持、管理员回应，并在条件成熟时纳入项目。</p></div><button className="button button-primary" onClick={openSuggestion}><Plus size={17} />提出建议</button></div><div className="suggestion-grid">{suggestions.map((suggestion) => <article className="suggestion-card" key={suggestion.id}><div className="inline-badges"><DemoDataBadge /><span className={`suggestion-status ${suggestion.status}`}>{suggestionLabels[suggestion.status]}</span></div><h3>{suggestion.title}</h3><p>{suggestion.content}</p>{suggestion.response ? <div className="admin-response"><strong>管理员回应</strong><p>{suggestion.response}</p></div> : null}<div className="suggestion-footer"><span>{suggestion.submittedAt}</span><button className={supported.includes(suggestion.id) ? "active" : ""} onClick={() => support(suggestion.id)}><Heart size={16} fill={supported.includes(suggestion.id) ? "currentColor" : "none"} />支持 {suggestion.supportCount + (supported.includes(suggestion.id) ? 1 : 0)}</button></div></article>)}</div></section> : null}
      {tab === "activities" ? <section><div className="tab-heading"><div><h2>近期社区活动</h2><p>通过讨论、观察、征集和走访参与村庄行动。</p></div><DemoDataBadge /></div><div className="activity-stack">{activities.map((activity) => <ActivityCard activity={activity} key={activity.id} />)}</div></section> : null}
      {tab === "surveys" ? <section><div className="tab-heading"><div><h2>调查问卷</h2><p>当前共有 {totalSurveyVotes} 份演示回答，提交后可以查看模拟统计。</p></div><DemoDataBadge /></div><div className="survey-grid">{surveys.map((survey) => { const submitted = submittedSurveys.includes(survey.id); const total = survey.options.reduce((sum, option) => sum + option.votes, 0); return <form className="survey-card" key={survey.id} onSubmit={(event) => submitSurvey(event, survey)}><div className="inline-badges"><DemoDataBadge /><span className={`activity-state ${survey.status}`}>{survey.status === "open" ? "进行中" : "已结束"}</span></div><h3>{survey.title}</h3><p>{survey.description}</p><div className="survey-options">{survey.options.map((option) => <label key={option.id}><input type="radio" name={survey.id} value={option.id} checked={surveyAnswers[survey.id] === option.id} onChange={() => setSurveyAnswers((current) => ({ ...current, [survey.id]: option.id }))} disabled={survey.status === "closed" || submitted} /><span>{option.label}</span>{submitted || survey.status === "closed" ? <b>{Math.round((option.votes / total) * 100)}%</b> : null}{submitted || survey.status === "closed" ? <i style={{ width: `${(option.votes / total) * 100}%` }} /> : null}</label>)}</div>{submitted ? <div className="survey-success"><CheckCircle2 size={18} />已提交，以上为模拟统计结果</div> : <button className="button button-primary" type="submit" disabled={survey.status === "closed"}><Send size={17} />{survey.status === "open" ? "提交问卷" : "问卷已结束"}</button>}</form>; })}</div></section> : null}
      {tab === "cocreate" ? <section><div className="tab-heading"><div><h2>公共空间共创讨论</h2><p>比较不同推进方式，查看意见后再作选择。</p></div><DemoDataBadge /></div><div className="cocreate-layout"><div className="scheme-grid">{[{ id: "a", title: "方案 A · 先做临时样段", text: "用可移动座椅、盆栽和遮阴构件测试真实使用情况。", support: 58 }, { id: "b", title: "方案 B · 先完善整体设计", text: "先完成材料、排水、绿化和维护方式的整体设计。", support: 42 }].map((scheme) => <article key={scheme.id} className={cocreateVote === scheme.id ? "selected" : ""}><div className="scheme-image">方案示意图占位</div><h3>{scheme.title}</h3><p>{scheme.text}</p><div className="progress-label"><span>当前模拟支持</span><strong>{scheme.support}%</strong></div><div className="progress-track"><span style={{ width: `${scheme.support}%` }} /></div><button className="button button-secondary" onClick={() => { if (!can(role, "comment")) { notify("请切换身份后投票"); return; } setCocreateVote(scheme.id); notify("选择已记录", "感谢参与演示共创。", "success"); }}>{cocreateVote === scheme.id ? "已选择" : "支持这个方案"}</button></article>)}</div><aside className="opinion-panel"><h3>不同意见</h3><blockquote>“临时样段更容易看到大家是否真的会使用。”<cite>— 村民意见占位</cite></blockquote><blockquote>“也要提前考虑排水和后续维护，避免反复施工。”<cite>— 协作者意见占位</cite></blockquote><p>以上均为演示文字，不代表红塘村真实意见。</p></aside></div></section> : null}
      <ConfirmationDialog open={suggestionOpen} title="提出村庄建议" description="请围绕一个具体使用场景说明建议。提交后状态为“待回应”。" confirmLabel="提交建议" onClose={() => setSuggestionOpen(false)} onConfirm={submitSuggestion}><div className="form-stack"><label className="field-label">建议标题<input className="text-input" value={suggestionTitle} onChange={(event) => setSuggestionTitle(event.target.value)} placeholder="一句话概括建议" /></label><label className="field-label">具体说明<textarea className="text-area" value={suggestionText} onChange={(event) => setSuggestionText(event.target.value)} placeholder="谁在什么情况下会使用？希望改善什么？" /></label></div></ConfirmationDialog>
    </div>
  );
}
