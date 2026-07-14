import { ArrowDown, Building2, HeartHandshake, History, Landmark, Leaf, Map, Quote, Store, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { contentService } from "@/services/content";

const chapters = [
  { id: "overview", icon: Map, title: "红塘村概况", text: "平台将从区位、空间、日常使用和村民关切等角度整理村庄概况。目前具体边界、面积和人口等资料尚未完成核实。" },
  { id: "history", icon: History, title: "村庄历史", text: "村庄历史需要结合文献、地方资料和经授权的村民口述共同核实，不自动编造具体建村年份和历史事件。" },
  { id: "environment", icon: Leaf, title: "自然环境", text: "未来将记录水体、绿地、农田与生态观察点，并区分现场观察、专业检测和村民经验三类信息。" },
  { id: "life", icon: UsersRound, title: "人口与社区生活", text: "关注儿童、青年、长者和日常照护等不同使用者，但所有人口结构与家庭信息必须经过授权和匿名处理。" },
  { id: "service", icon: HeartHandshake, title: "公共服务", text: "从“能否到达、是否易懂、是否好用”三个角度记录公共设施和社区活动体验。" },
  { id: "industry", icon: Store, title: "产业与经营", text: "后续通过真实调研补充本地经营、就业与合作机会，不以未经确认的收入和产值数据代替实际情况。" },
  { id: "culture", icon: Landmark, title: "村庄文化", text: "照片、口述、建筑和习俗资料需要保留来源、授权范围与核实状态，让村民成为文化记录的主体。" },
  { id: "space", icon: Building2, title: "村庄空间", text: "未来可连接建筑、道路、水体和公共设施空间数据，并通过 PostGIS 与数字沙盘进行更新。" },
];

export default function VillagePage() {
  const profile = contentService.getVillageProfile();
  const stories = contentService.getVillageStories();
  const timeline = contentService.getVillageTimeline();
  return (
    <main className="village-page"><PageHeader eyebrow="KNOW HONGTANG" title="认识红塘" description="通过空间、日常生活、地方记忆与行动过程逐步认识村庄；不以未经确认的数字代替真实调查。" />
      <section className="village-banner"><div className="page-container"><div><DemoDataBadge /><h2>{profile.name}</h2><p>{profile.summary}</p><span>{profile.notice}</span></div><div className="village-banner-art"><i /><i /><i /><span>红砖 · 绿植 · 田园 · 社区生活<br />视觉场景占位</span></div></div></section>
      <nav className="story-nav page-container" aria-label="认识红塘章节">{chapters.map((chapter) => <a href={`#${chapter.id}`} key={chapter.id}>{chapter.title}</a>)}</nav>
      <section className="story-map page-container">{chapters.map((chapter, index) => { const Icon = chapter.icon; return <article id={chapter.id} key={chapter.id} className={index % 2 ? "reverse" : ""}><div className={`story-visual story-visual-${index + 1}`}><Icon size={34} /><span>{chapter.title}图片或地图占位</span><DemoDataBadge /></div><div className="story-copy"><span>0{index + 1}</span><Icon size={24} /><h2>{chapter.title}</h2><p>{chapter.text}</p><div className="data-placeholder">此处待补充红塘村真实调查数据</div>{index < chapters.length - 1 ? <ArrowDown size={19} className="story-arrow" /> : null}</div></article>; })}</section>
      <section className="village-stories"><div className="page-container"><div className="section-heading"><div><span>村民故事</span><h2>让真实讲述进入村庄档案</h2></div><p>正式内容将记录讲述者授权、采集时间和公开范围。</p></div><div className="story-quote-grid">{stories.map((story) => <blockquote key={story.id}><Quote size={24} /><p>{story.quote}</p><cite>{story.author}</cite><small>{story.note}</small></blockquote>)}</div></div></section>
      <section className="page-section page-container"><div className="section-heading"><div><span>发展时间线</span><h2>从资料准备到持续更新</h2></div><DemoDataBadge /></div><div className="village-timeline">{timeline.map((item, index) => <article key={item.year}><span>{index + 1}</span><strong>{item.year}</strong><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>
    </main>
  );
}
