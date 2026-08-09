import Link from "next/link";
import { ArrowRight, BarChart3, Sun, Wrench } from "lucide-react";
import { VillageMatterMap } from "@/components/village-life/VillageMatterMap";
import { contentService } from "@/services/content";
import { MapFeatureType } from "@/types";

export default function SolarPage() {
  const features = contentService.getMapFeatures().filter((feature) => feature.featureType === MapFeatureType.SolarFacility);
  return (
    <main className="matter-page matter-solar-page">
      <VillageMatterMap topicId="solar" eyebrow="设施运行与共同收益" title="光伏设施" description="先在地图上查看光伏设施，再进入运行巡查、维护和信息公开。" visibleLabel="光伏设施点位" features={features} />
      <section className="page-container matter-page-body" id="matter-functions">
        <div className="matter-page-status"><BarChart3 size={23} /><div><strong>独立页面已经建立</strong><p>设备数据和收益口径尚未确认，因此本阶段只建立入口，不展示未经核实的数字。</p></div></div>
        <div className="matter-module-grid">
          <article><span>01</span><h2>设施位置</h2><p>预留光伏板和配套设备的台账位置。</p><small>功能待讨论</small></article>
          <article><span>02</span><h2>运行巡查</h2><p>预留异常、维护和巡查记录的位置。</p><small>功能待讨论</small></article>
          <article><span>03</span><h2>信息公开</h2><p>预留村民关心的运行与收益说明区域。</p><small>功能待讨论</small></article>
        </div>
        <div className="matter-page-actions"><Link href="/map" className="button button-primary"><Sun size={18} />查看设施位置</Link><Link href="/report" className="button button-secondary"><Wrench size={18} />记录设施问题 <ArrowRight size={17} /></Link></div>
      </section>
    </main>
  );
}
