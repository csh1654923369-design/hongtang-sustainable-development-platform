import Link from "next/link";
import { ArrowRight, MapPinned, Wrench } from "lucide-react";
import { VillageMatterMap } from "@/components/village-life/VillageMatterMap";
import { contentService } from "@/services/content";
import { MapFeatureType } from "@/types";

export default function WaterPage() {
  const features = contentService.getMapFeatures().filter((feature) => feature.featureType === MapFeatureType.WaterFacility);
  return (
    <main className="matter-page matter-water-page">
      <VillageMatterMap topicId="water" eyebrow="水从哪里来，问题怎样解决" title="村里用水" description="先在地图上查看用水设施，再了解水源、用水问题和维修反馈。" visibleLabel="村里用水设施点位" features={features} />
      <section className="page-container matter-page-body" id="matter-functions">
        <div className="matter-page-status"><Wrench size={23} /><div><strong>独立页面已经建立</strong><p>设施位置、上报方式和维修流程需要实地核对后再确定，现在不套用其他事项的逻辑。</p></div></div>
        <div className="matter-module-grid">
          <article><span>01</span><h2>水源与设施</h2><p>预留水池、管线和供水范围的展示位置。</p><small>功能待讨论</small></article>
          <article><span>02</span><h2>用水问题</h2><p>预留停水、漏水和水质情况的记录入口。</p><small>功能待讨论</small></article>
          <article><span>03</span><h2>维修反馈</h2><p>预留处理人员、进度和结果反馈的位置。</p><small>功能待讨论</small></article>
        </div>
        <div className="matter-page-actions"><Link href="/report" className="button button-primary"><Wrench size={18} />记录用水问题</Link><Link href="/map" className="button button-secondary"><MapPinned size={18} />查看村里一张图 <ArrowRight size={17} /></Link></div>
      </section>
    </main>
  );
}
