import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Image as ImageIcon, Map, Sprout } from "lucide-react";

export function HeroSection() {
  return (
    <section className="home-hero home-hero-aerial">
      <div className="page-container hero-grid">
        <div className="hero-copy">
          <div className="eyebrow-line"><span>HONGTANG VILLAGE</span><span className="aerial-source-badge"><ImageIcon size={14} />红塘村无人机影像</span></div>
          <h1>先看见村庄<br /><em>再走进每一件事</em></h1>
          <p>从小花园、茶厂、村里用水等具体事情进入。每一件事都有自己的页面和功能，不需要先弄懂复杂的平台分类。</p>
          <div className="hero-buttons"><Link href="#village-topics" className="button button-primary button-large"><Sprout size={19} />选择一件村里的事</Link><Link href="/map" className="button button-secondary button-large"><Map size={19} />查看完整影像地图</Link></div>
          <Link href="#resident-start" className="hero-text-link">只是想记录问题或看看近况？从常用操作开始 <ArrowRight size={17} /></Link>
        </div>
        <Link href="/map" className="hero-aerial-card" aria-label="打开红塘村无人机影像地图">
          <Image src="/data/hongtang-orthophoto-0.3m.webp" width={3357} height={3554} unoptimized priority alt="红塘村无人机正射影像" />
          <span className="hero-aerial-topline"><ImageIcon size={15} />无人机影像 · 0.3米展示版</span>
          <span className="hero-aerial-caption"><strong>红塘村全村影像</strong><small>点击进入“村里一张图”查看</small><ArrowRight size={18} /></span>
        </Link>
      </div>
    </section>
  );
}
