import Link from "next/link";
import { ArrowRight, Leaf, NotebookTabs } from "lucide-react";
import { VillageMatterMap } from "@/components/village-life/VillageMatterMap";
import { contentService } from "@/services/content";
import { MapFeatureType } from "@/types";

export default function TeaFactoryPage() {
  const features = contentService.getMapFeatures().filter((feature) => feature.featureType === MapFeatureType.TeaGarden || feature.featureType === MapFeatureType.TeaFactory);
  return (
    <main className="matter-page matter-tea-page">
      <VillageMatterMap topicId="tea" eyebrow="从茶场到茶厂" title="茶厂" description="先在地图上查看茶场和茶厂，再进入茶园管理、收茶与加工等后续功能。" visibleLabel="茶场与茶厂点位" features={features} />
      <section className="page-container matter-page-body" id="matter-functions">
        <div className="matter-page-status"><Leaf size={23} /><div><strong>独立页面已经建立</strong><p>目前只梳理业务阶段，不预设表单和操作，避免在不了解真实流程前做成通用模板。</p></div></div>
        <div className="matter-module-grid matter-process-grid">
          <article><span>01</span><h2>茶园</h2><p>预留茶园管护与采摘环节的独立区域。</p><small>功能待讨论</small></article>
          <article><span>02</span><h2>收茶</h2><p>预留茶青进厂、用工和批次信息的位置。</p><small>功能待讨论</small></article>
          <article><span>03</span><h2>加工</h2><p>预留设备、工序和产品去向等内容。</p><small>功能待讨论</small></article>
        </div>
        <div className="matter-page-actions"><Link href="/research" className="button button-primary"><NotebookTabs size={18} />补充调研资料</Link><Link href="/map" className="button button-secondary">查看茶厂所在位置 <ArrowRight size={17} /></Link></div>
      </section>
    </main>
  );
}
