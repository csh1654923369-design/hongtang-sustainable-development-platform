"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calculator, Database, Link2, X } from "lucide-react";
import { Indicator } from "@/types";
import { IndicatorCard } from "@/components/dashboard/IndicatorCard";
import { DataSourceLabel } from "@/components/common/DataSourceLabel";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { contentService } from "@/services/content";

export function ProgressDashboard({ indicators }: { indicators: Indicator[] }) {
  const [range, setRange] = useState<3 | 6>(6);
  const [selected, setSelected] = useState<Indicator | null>(null);
  const goals = contentService.getGoals();
  const chartData = useMemo(() => indicators[0].records.slice(-range).map((record, index) => ({ period: record.period.slice(5) + "月", 完成率: record.value, 活动参与: Math.round(indicators[5].records.slice(-range)[index]?.value / 2) })), [indicators, range]);
  const grouped = goals.map((goal) => ({ goal, indicators: indicators.filter((indicator) => indicator.goalId === goal.id) })).filter((group) => group.indicators.length);
  return (
    <>
      <section className="chart-panel content-card"><div className="card-heading"><div><h2>近期变化趋势</h2><p>鼠标悬停查看数值，切换时间范围观察变化。</p></div><div className="range-switch"><button className={range === 3 ? "active" : ""} onClick={() => setRange(3)}>近3个月</button><button className={range === 6 ? "active" : ""} onClick={() => setRange(6)}>近6个月</button></div></div><div className="charts-grid"><div><h3>公共空间环境问题完成率</h3><ResponsiveContainer width="100%" height={280}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#dde3dd" /><XAxis dataKey="period" /><YAxis domain={[0, 100]} /><Tooltip /><Legend /><Line type="monotone" dataKey="完成率" stroke="#2F6B4F" strokeWidth={3} dot={{ fill: "#2F6B4F" }} /></LineChart></ResponsiveContainer></div><div><h3>活动参与人次（缩放演示）</h3><ResponsiveContainer width="100%" height={280}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#dde3dd" /><XAxis dataKey="period" /><YAxis /><Tooltip /><Bar dataKey="活动参与" fill="#A6533D" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div><DataSourceLabel source="平台模拟问题处理与活动登记记录" updatedAt="2026-07-13" /></section>
      <div className="goal-indicator-groups">{grouped.map(({ goal, indicators: goalIndicators }) => <section key={goal.id}><div className="indicator-group-heading"><span style={{ background: goal.color }}>{goal.index}</span><div><h2>{goal.title}</h2><p>{goal.description}</p></div></div><div className="indicator-grid">{goalIndicators.map((indicator) => <IndicatorCard indicator={indicator} key={indicator.id} onClick={setSelected} />)}</div></section>)}</div>
      {selected ? <div className="drawer-backdrop" role="presentation" onMouseDown={() => setSelected(null)}><aside className="indicator-drawer" role="dialog" aria-modal="true" aria-labelledby="indicator-title" onMouseDown={(event) => event.stopPropagation()}><button className="icon-button drawer-close" onClick={() => setSelected(null)} aria-label="关闭指标详情"><X size={20} /></button><div className="inline-badges"><DemoDataBadge /><span className="trend trend-up">{selected.change}</span></div><h2 id="indicator-title">{selected.name}</h2><div className="drawer-value"><strong>{selected.value}</strong><span>{selected.unit}</span><small>目标值 {selected.target}{selected.unit}</small></div><div className="drawer-section"><h3><Database size={18} />指标定义</h3><p>{selected.definition}</p></div><div className="drawer-section"><h3><Calculator size={18} />计算方式</h3><p>{selected.method}</p></div><div className="drawer-section"><h3><Link2 size={18} />数据完整度</h3><div className="progress-label"><span>当前完整度</span><strong>{selected.completeness}%</strong></div><div className="progress-track"><span style={{ width: `${selected.completeness}%` }} /></div></div><div className="drawer-chart"><ResponsiveContainer width="100%" height={210}><LineChart data={selected.records}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" tickFormatter={(value) => String(value).slice(5)} /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" stroke="#2F6B4F" strokeWidth={3} /></LineChart></ResponsiveContainer></div><DataSourceLabel source={selected.source} updatedAt={selected.updatedAt} /><p className="drawer-admin">数据管理员：平台演示管理员</p></aside></div> : null}
    </>
  );
}
