import { PageHeader } from "@/components/common/PageHeader";
import { VillageMattersHub } from "@/components/village-life/VillageMattersHub";

export default function VillageLifePage() {
  return (
    <main>
      <PageHeader
        eyebrow="VILLAGE LIFE"
        title="村里的事"
        description="小花园、茶产业、村里用水、塌方与安全、历史与文化，都从这里看。选择一类，就能看到最近变化和可以参与的事情。"
      />
      <div className="page-container village-life-page"><VillageMattersHub /></div>
    </main>
  );
}
