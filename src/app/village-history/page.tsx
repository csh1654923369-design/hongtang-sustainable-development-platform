import Link from "next/link";
import { ArrowRight, BookOpenText, Images } from "lucide-react";
import { VillageMatterMap } from "@/components/village-life/VillageMatterMap";
import { contentService } from "@/services/content";
import { MapFeatureType } from "@/types";

export default function VillageHistoryPage() {
  const features = contentService.getMapFeatures().filter((feature) => feature.featureType === MapFeatureType.VillageMemory);
  return (
    <main className="matter-page matter-history-page">
      <VillageMatterMap topicId="history" eyebrow="让村里的故事留得下来" title="村庄记忆" description="先在地图上找到记忆资料点，再查看老照片、村民讲述、古道和老屋档案。" visibleLabel="村庄记忆点位" features={features} />
      <section className="page-container matter-page-body" id="matter-functions">
        <div className="matter-page-status"><BookOpenText size={23} /><div><strong>独立页面已经建立</strong><p>资料授权、人物姓名和公开范围需要逐项确认，后续会按村庄档案的方式单独设计。</p></div></div>
        <div className="matter-module-grid">
          <article><span>01</span><h2>老照片</h2><p>预留照片年代、地点和人物说明的位置。</p><small>功能待讨论</small></article>
          <article><span>02</span><h2>村民讲述</h2><p>预留口述故事、声音和文字整理的位置。</p><small>功能待讨论</small></article>
          <article><span>03</span><h2>古道与老屋</h2><p>预留重要地点和建筑资料的档案位置。</p><small>功能待讨论</small></article>
        </div>
        <div className="matter-page-actions"><Link href="/research" className="button button-primary"><Images size={18} />提交一份资料</Link><Link href="/village" className="button button-secondary">继续认识红塘 <ArrowRight size={17} /></Link></div>
      </section>
    </main>
  );
}
