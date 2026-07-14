"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import { Indicator } from "@/types";
import { DataSourceLabel } from "@/components/common/DataSourceLabel";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";

const trendIcons = { up: ArrowUpRight, down: ArrowDownRight, stable: Minus };

export function IndicatorCard({ indicator, onClick }: { indicator: Indicator; onClick?: (indicator: Indicator) => void }) {
  const TrendIcon = trendIcons[indicator.trend];
  return (
    <button className="indicator-card" onClick={() => onClick?.(indicator)}>
      <div className="indicator-top"><DemoDataBadge /><span className={`trend trend-${indicator.trend}`}><TrendIcon size={16} />{indicator.change}</span></div>
      <h3>{indicator.name}</h3>
      <div className="indicator-value"><strong>{indicator.value}</strong><span>{indicator.unit}</span><small>目标 {indicator.target}{indicator.unit}</small></div>
      <div className="progress-track"><span style={{ width: `${Math.min(100, (indicator.value / indicator.target) * 100)}%` }} /></div>
      <DataSourceLabel source={indicator.source} updatedAt={indicator.updatedAt} />
      <span className="card-link">查看指标说明 <ArrowRight size={15} /></span>
    </button>
  );
}
