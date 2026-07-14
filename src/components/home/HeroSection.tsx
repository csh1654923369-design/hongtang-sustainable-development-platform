"use client";

import Link from "next/link";
import { ArrowRight, Map, Sparkles, UsersRound } from "lucide-react";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";
import { useRouter } from "next/navigation";

export function HeroSection() {
  const { role, notify } = useDemo();
  const router = useRouter();
  const participate = () => {
    if (!can(role, "joinActivity")) { notify("欢迎先浏览平台", "切换为村民或协作者后，可以报名活动、提出建议和参与问卷。" ); return; }
    router.push("/participate");
  };
  return (
    <section className="home-hero">
      <div className="page-container hero-grid">
        <div className="hero-copy">
          <div className="eyebrow-line"><span>HONGTANG VILLAGE</span><DemoDataBadge /></div>
          <h1>共同建设一个<br /><em>更宜居、更有活力</em>的红塘村</h1>
          <p>记录村庄变化，了解发展进展，参与公共行动，让每一条建议都有回应。</p>
          <div className="hero-buttons"><Link href="/map" className="button button-primary button-large"><Map size={19} />查看村庄行动地图</Link><button className="button button-secondary button-large" onClick={participate}><UsersRound size={19} />我要参与</button></div>
          <Link href="/goals" className="hero-text-link">了解红塘村可持续发展目标 <ArrowRight size={17} /></Link>
        </div>
        <div className="hero-scene" aria-label="红塘村场景插画占位">
          <div className="scene-sun" />
          <div className="scene-hills back" /><div className="scene-hills front" />
          <div className="scene-house house-one"><span /></div><div className="scene-house house-two"><span /></div><div className="scene-house house-three"><span /></div>
          <div className="scene-road" /><div className="scene-tree tree-one" /><div className="scene-tree tree-two" />
          <span className="scene-label"><Sparkles size={15} />村庄场景插画占位 · 非真实影像</span>
          <aside className="hero-stats-card"><div><small>本月新增村民建议</small><strong>12<em>条</em></strong></div><div><small>正在推进项目</small><strong>4<em>个</em></strong></div><div><small>已完成社区行动</small><strong>18<em>项</em></strong></div><div className="next-activity"><small>下一场活动</small><strong>村庄公共空间共创讨论</strong><span>7月20日 · 演示数据</span></div></aside>
        </div>
      </div>
    </section>
  );
}
