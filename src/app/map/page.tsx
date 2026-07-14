import { MapExplorer } from "@/components/map/MapExplorer";
import { PageHeader } from "@/components/common/PageHeader";
import { contentService } from "@/services/content";

export default function MapPage() {
  const features = contentService.getMapFeatures();
  return (
    <main className="map-page">
      <PageHeader eyebrow="VILLAGE ACTION MAP" title="村庄行动地图" description="把村庄资源、问题、项目与行动放在同一张可参与、可追踪的地图上。当前底图、坐标和点位均为演示数据。" />
      <div className="map-page-container"><MapExplorer features={features} /></div>
    </main>
  );
}
