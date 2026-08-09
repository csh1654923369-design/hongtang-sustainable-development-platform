import Link from "next/link";
import { ArrowRight, Camera, ShieldCheck } from "lucide-react";
import { VillageMatterMap } from "@/components/village-life/VillageMatterMap";
import { contentService } from "@/services/content";
import { MapFeatureType } from "@/types";

export default function SafetyPage() {
  const features = contentService.getMapFeatures().filter((feature) => feature.featureType === MapFeatureType.SafetyRisk);
  return (
    <main className="matter-page matter-safety-page">
      <VillageMatterMap topicId="safety" eyebrow="看见风险，跟进处理" title="安全隐患" description="先在地图上查看安全巡查点，再进入隐患记录、办理进度和现场复查。" visibleLabel="安全隐患点位" features={features} />
      <section className="page-container matter-page-body" id="matter-functions">
        <div className="matter-page-status"><ShieldCheck size={23} /><div><strong>独立页面已经建立</strong><p>风险等级和办理规则需要村委及专业人员确认，当前页面不自动作出安全结论。</p></div></div>
        <div className="matter-module-grid matter-safety-flow">
          <article><span>01</span><h2>发现隐患</h2><p>预留现场照片、位置和简短说明入口。</p><small>功能待讨论</small></article>
          <article><span>02</span><h2>跟进处理</h2><p>预留负责人、措施和办理进度的位置。</p><small>功能待讨论</small></article>
          <article><span>03</span><h2>现场复查</h2><p>预留雨后或处理后的复查记录。</p><small>功能待讨论</small></article>
        </div>
        <div className="matter-page-actions"><Link href="/report" className="button button-primary"><Camera size={18} />记录安全隐患</Link><Link href="/progress" className="button button-secondary">查看办理进度 <ArrowRight size={17} /></Link></div>
      </section>
    </main>
  );
}
