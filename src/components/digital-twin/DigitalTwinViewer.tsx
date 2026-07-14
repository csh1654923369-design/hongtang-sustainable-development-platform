"use client";

import { Box, Building2, Layers3, MessageSquare, Trees, X } from "lucide-react";
import { useState } from "react";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { CommentSection } from "@/components/common/CommentSection";

export function DigitalTwinViewer() {
  const [buildings, setBuildings] = useState(true);
  const [projects, setProjects] = useState(true);
  const [trees, setTrees] = useState(true);
  const [scheme, setScheme] = useState<"current" | "a" | "b">("current");
  const [selectedBuilding, setSelectedBuilding] = useState(false);
  return (
    <div className="digital-twin-module">
      <div className="twin-toolbar"><div><Layers3 size={18} /><strong>图层</strong><label><input type="checkbox" checked={buildings} onChange={(event) => setBuildings(event.target.checked)} />建筑</label><label><input type="checkbox" checked={projects} onChange={(event) => setProjects(event.target.checked)} />项目</label><label><input type="checkbox" checked={trees} onChange={(event) => setTrees(event.target.checked)} />绿化</label></div><div className="scheme-switch"><button className={scheme === "current" ? "active" : ""} onClick={() => setScheme("current")}>现状</button><button className={scheme === "a" ? "active" : ""} onClick={() => setScheme("a")}>方案 A</button><button className={scheme === "b" ? "active" : ""} onClick={() => setScheme("b")}>方案 B</button></div><DemoDataBadge label="三维场景占位" /></div>
      <div className={`twin-viewport scheme-${scheme}`}>
        <div className="twin-grid" />
        {trees ? <><span className="twin-tree tree-a"><Trees size={26} /></span><span className="twin-tree tree-b"><Trees size={22} /></span><span className="twin-tree tree-c"><Trees size={30} /></span></> : null}
        {buildings ? <div className="building-cluster">{Array.from({ length: 8 }, (_, index) => <button key={index} className={`twin-building building-${index + 1}`} onClick={() => setSelectedBuilding(true)} aria-label={`查看建筑演示对象 ${index + 1}`}><span /><i /><small>{index === 2 ? "点击查看" : ""}</small></button>)}</div> : null}
        {projects ? <div className="twin-project-area"><span>村口公共空间项目范围</span></div> : null}
        <div className="twin-water" /><div className="twin-compass">N ↑</div><div className="twin-placeholder-copy"><Box size={32} /><strong>DigitalTwinViewer</strong><p>未来可在此替换为 Cesium 或三维高斯场景，不改变其他页面业务逻辑。</p></div>
        {selectedBuilding ? <aside className="building-info"><button className="icon-button" onClick={() => setSelectedBuilding(false)}><X size={18} /></button><Building2 size={25} /><DemoDataBadge /><h3>建筑信息面板</h3><dl><div><dt>对象类型</dt><dd>建筑演示对象</dd></div><div><dt>资料状态</dt><dd>待实地核实</dd></div><div><dt>关联方案</dt><dd>{scheme === "current" ? "现状" : `改造方案 ${scheme.toUpperCase()}`}</dd></div></dl><p>不展示产权、住户或其他敏感信息。</p></aside> : null}
      </div>
      <div className="twin-caption"><span><MessageSquare size={17} />方案说明</span><p>{scheme === "current" ? "现状模式用于查看重点区域与已登记对象。" : scheme === "a" ? "方案 A：以临时样段和可移动设施验证使用需求。" : "方案 B：以整体空间设计和长期维护为重点。"}</p></div>
      <CommentSection />
    </div>
  );
}
