"use client";

import Link from "next/link";
import { Plus, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { MicroActionCard } from "@/components/actions/MicroActionCard";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { useDemo } from "@/components/providers/DemoProvider";

export function MicroActionHub() {
  const { microActions } = useDemo();
  return (
    <section className="micro-action-hub" id="micro-actions" data-testid="projects-micro-actions">
      <div className="page-container">
        <div className="micro-action-intro"><div><div className="eyebrow-line"><span>居民发起 · 小步试验</span><DemoDataBadge /></div><h2>社区微行动</h2><p>从 30 至 90 天的小试验开始：发起人提出方向，平台轻量核对，伙伴共同投入时间、材料、技能和地方经验。</p></div><Link className="button button-primary button-large" href="/actions/new"><Plus size={18} />发起一个小行动</Link></div>
        <div className="action-principles"><span><Sparkles size={17} /><b>从小处开始</b>先试验，再决定是否长期实施</span><span><UsersRound size={17} /><b>由居民组织</b>平台负责连接和安全边界</span><span><ShieldCheck size={17} /><b>责任说清楚</b>公开决策与后续维护安排</span></div>
        <div className="micro-action-grid">{microActions.map((action) => <MicroActionCard action={action} key={action.id} />)}</div>
      </div>
    </section>
  );
}
