import { PageHeader } from "@/components/common/PageHeader";
import { ParticipationHub } from "@/components/participation/ParticipationHub";
import { activityService } from "@/services/activities";
import { contentService } from "@/services/content";

export default function ParticipatePage() {
  return <main><PageHeader eyebrow="PUBLIC PARTICIPATION" title="公众参与" description="上报之外，你也可以提出建议、报名活动、参与问卷，并在方案讨论中表达具体意见。" /><section className="page-container page-section"><ParticipationHub suggestions={contentService.getSuggestions()} activities={activityService.list()} surveys={contentService.getSurveys()} /></section></main>;
}
