import Link from "next/link";
import { ArrowRight, Camera, Sprout } from "lucide-react";
import { VillageMatterMap } from "@/components/village-life/VillageMatterMap";
import { contentService } from "@/services/content";
import { MapFeatureType } from "@/types";

export default function GardenPage() {
  const features = contentService.getMapFeatures().filter((feature) => feature.featureType === MapFeatureType.Garden);
  return (
    <main className="matter-page matter-garden-page">
      <VillageMatterMap topicId="garden" eyebrow="我家门前的一小块地方" title="小花园" description="先从地图找到村里的小花园，再查看四季变化、村民经验和后续记录。" visibleLabel="小花园点位" features={features} />
      <section className="page-container matter-page-body" id="matter-functions">
        <div className="matter-page-status"><Sprout size={23} /><div><strong>独立页面已经建立</strong><p>具体要记录什么、谁来记录、怎样展示，后续再和村民及老师一起确定。</p></div></div>
        <div className="matter-module-grid">
          <article><span>01</span><h2>我的花园</h2><p>为每户的小花园预留自己的内容位置。</p><small>功能待讨论</small></article>
          <article><span>02</span><h2>四季变化</h2><p>预留种植、开花和收获等季节记录位置。</p><small>功能待讨论</small></article>
          <article><span>03</span><h2>村民经验</h2><p>预留互相交流种植办法和材料的空间。</p><small>功能待讨论</small></article>
        </div>
        <div className="matter-page-actions"><Link href="/report" className="button button-primary"><Camera size={18} />先记录一件事</Link><Link href="/map" className="button button-secondary">在影像上看村庄 <ArrowRight size={17} /></Link></div>
      </section>
    </main>
  );
}
