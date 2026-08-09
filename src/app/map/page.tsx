import { MapExplorer } from "@/components/map/MapExplorer";
import { BuildingSurveyExplorer } from "@/components/map/BuildingSurveyExplorer";
import { PageHeader } from "@/components/common/PageHeader";
import { CommunityResourceBoard } from "@/components/map/CommunityResourceBoard";

export default function MapPage() {
  return (
    <main className="map-page">
      <PageHeader eyebrow="VILLAGE MAP" title="村里一张图" description="在手绘图上查找小花园、茶场、茶厂、用水设施等村庄资料，并查看对应现场照片和坐标。地图还可切换无人机影像与简化示意图；问题、行动和互助资源继续作为平台互动内容显示。" />
      <div className="map-page-container"><MapExplorer /></div>
      <CommunityResourceBoard />
      <BuildingSurveyExplorer />
    </main>
  );
}
