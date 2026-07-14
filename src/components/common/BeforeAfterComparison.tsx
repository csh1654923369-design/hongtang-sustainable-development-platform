"use client";

import { useState } from "react";

export function BeforeAfterComparison({ beforeLabel = "整改前", afterLabel = "整改后" }: { beforeLabel?: string; afterLabel?: string }) {
  const [position, setPosition] = useState(52);
  return (
    <div className="before-after">
      <div className="comparison-stage">
        <div className="comparison-before"><span>{beforeLabel}</span><small>图片占位 · 演示内容</small></div>
        <div className="comparison-after" style={{ clipPath: `inset(0 0 0 ${position}%)` }}><span>{afterLabel}</span><small>图片占位 · 演示内容</small></div>
        <div className="comparison-line" style={{ left: `${position}%` }}><span>↔</span></div>
      </div>
      <label>拖动查看前后对比<input type="range" min="12" max="88" value={position} onChange={(event) => setPosition(Number(event.target.value))} /></label>
    </div>
  );
}
