"use client";

import Link from "next/link";
import { ArrowRight, Camera, Droplets, History, Leaf, Map, MessageSquareText, ShieldAlert, Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import { villageMatters } from "@/data/villageMatters";

const icons = {
  garden: Sprout,
  tea: Leaf,
  water: Droplets,
  safety: ShieldAlert,
  history: History,
};

export function VillageMattersHub() {
  const [selectedId, setSelectedId] = useState(villageMatters[0].id);

  useEffect(() => {
    const selectFromHash = () => {
      const id = window.location.hash.slice(1);
      if (villageMatters.some((matter) => matter.id === id)) setSelectedId(id);
    };
    const timer = window.setTimeout(selectFromHash, 0);
    window.addEventListener("hashchange", selectFromHash);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", selectFromHash);
    };
  }, []);

  const selected = villageMatters.find((matter) => matter.id === selectedId) ?? villageMatters[0];
  const SelectedIcon = icons[selected.icon];

  const selectMatter = (id: string) => {
    setSelectedId(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <>
      <section className="village-matters-selector" aria-label="选择一类村里的事">
        {villageMatters.map((matter) => {
          const Icon = icons[matter.icon];
          const active = matter.id === selectedId;
          return (
            <button
              className={`village-matter-choice matter-${matter.icon}${active ? " active" : ""}`}
              id={matter.id}
              key={matter.id}
              onClick={() => selectMatter(matter.id)}
              aria-pressed={active}
              aria-controls="village-matter-detail"
            >
              <Icon size={27} />
              <span><strong>{matter.title}</strong><small>{matter.subtitle}</small></span>
            </button>
          );
        })}
      </section>

      <section className={`village-matter-detail matter-${selected.icon}`} id="village-matter-detail" aria-live="polite">
        <div className="matter-detail-heading">
          <span className="village-matter-icon"><SelectedIcon size={32} /></span>
          <div><span>当前查看</span><h2>{selected.title}</h2><p>{selected.description}</p></div>
        </div>
        <div className="matter-detail-grid">
          <div className="matter-latest"><strong>最近在记录什么</strong><p>{selected.latestUpdate}</p><small>以上为演示内容，相关资料将在村民和村委确认后补充。</small></div>
          <div><strong>以后会连续记录</strong><ul>{selected.recordItems.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
        <div className="matter-detail-actions">
          <Link href={selected.relatedHref} className="button button-secondary"><Map size={18} />{selected.relatedLabel}</Link>
          <Link href="/report" className="button button-primary"><Camera size={18} />我要记录一件事</Link>
        </div>
      </section>

      <section className="village-updates" id="updates">
        <div className="section-heading"><div><span>最近的变化</span><h2>村里最近有什么新情况？</h2></div><p>先用短句展示，点进去再看详细过程。</p></div>
        <div className="village-update-list">
          <Link href="/issues/issue-4"><span>已处理</span><strong>村巷照明完成现场检查，等待村民评价</strong><small>7月 · 演示记录</small><ArrowRight size={19} /></Link>
          <Link href="/projects/water-environment"><span>进行中</span><strong>村内水环境改善行动正在推进</strong><small>7月 · 演示记录</small><ArrowRight size={19} /></Link>
          <Link href="/participate"><span>可参加</span><strong>村庄公共空间共创讨论开放报名</strong><small>近期 · 演示活动</small><ArrowRight size={19} /></Link>
        </div>
      </section>

      <section className="easy-record-guide">
        <div><MessageSquareText size={28} /><strong>不会写很多字也没关系</strong><p>测试阶段写几个字就能继续；有照片可以一起提交，也可以请村干部或志愿者帮忙记录。</p></div>
        <Link href="/report" className="button button-primary">现在试着记录 <ArrowRight size={17} /></Link>
      </section>
    </>
  );
}
