import { BarChart3, CheckCircle2, Clock3, Database } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ProgressDashboard } from "@/components/dashboard/ProgressDashboard";
import { indicatorService } from "@/services/indicators";

export default function ProgressPage() {
  const indicators = indicatorService.list();
  return <main><PageHeader eyebrow="DEVELOPMENT PROGRESS" title="红塘村最近发生了哪些变化？" description="用容易理解的趋势、来源和完整度说明变化，而不是只堆叠复杂图表。所有数值均为演示数据。" /><section className="page-container progress-summary"><div><Clock3 size={21} /><span>数据更新时间</span><strong>2026-07-13</strong></div><div><Database size={21} /><span>已纳入指标</span><strong>{indicators.length} 项</strong></div><div><CheckCircle2 size={21} /><span>正在改善</span><strong>6 项</strong></div><div><BarChart3 size={21} /><span>平均完整度</span><strong>72%</strong></div></section><section className="page-container page-section"><ProgressDashboard indicators={indicators} /></section></main>;
}
