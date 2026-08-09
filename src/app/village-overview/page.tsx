import Link from "next/link";
import { Quote } from "lucide-react";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickActionCard } from "@/components/home/QuickActionCard";
import { VillageMatterOverview } from "@/components/village-life/VillageMatterOverview";

export default function VillageOverviewPage() {
  return (
    <main>
      <HeroSection />

      <section className="page-section village-matters-home" id="village-topics">
        <div className="page-container">
          <div className="section-heading"><div><span>一件事，一个入口</span><h2>你今天想看哪件事？</h2></div><p>小花园、茶厂、用水等内容彼此独立。以后每个入口都会按实际需要开发不同功能。</p></div>
          <VillageMatterOverview />
        </div>
      </section>

      <section className="page-section page-container resident-start-section" id="resident-start">
        <div className="section-heading"><div><span>不确定看哪一项时</span><h2>三个常用操作</h2></div><p>找地点、记问题、看变化，都可以直接开始。</p></div>
        <div className="resident-action-grid">
          <QuickActionCard icon="map" title="打开村里一张图" description="查看无人机影像，以及村里的地点和记录" href="/map" />
          <QuickActionCard icon="report" title="我要记录一件事" description="拍张照片，写几个字，告诉大家发生了什么" href="/report" permission="reportIssue" />
          <QuickActionCard icon="change" title="看看最近的变化" description="查看事情正在做什么、已经做到哪一步" href="/progress" />
        </div>
      </section>

      <section className="page-section page-container home-more-section">
        <div className="section-heading"><div><span>其他工具</span><h2>需要时再打开</h2></div><p>研究、规划和管理类内容不再占用顶部事项导航。</p></div>
        <div className="home-more-links"><Link href="/participate">村里活动</Link><Link href="/projects">项目与行动</Link><Link href="/village">认识红塘</Link><Link href="/goals">可持续目标</Link><Link href="/research">调研资料</Link><Link href="/digital-twin">数字沙盘</Link></div>
      </section>

      <section className="home-closing"><div className="page-container"><Quote size={28} /><p>“共同记录村庄，共同参与行动，共同见证改变。”</p><span>平台所有具体村情资料将在实地调研和村委确认后补充</span></div></section>
    </main>
  );
}
