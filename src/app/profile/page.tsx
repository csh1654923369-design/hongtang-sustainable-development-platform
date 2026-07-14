import { PageHeader } from "@/components/common/PageHeader";
import { ProfileDashboard } from "@/components/profile/ProfileDashboard";

export default function ProfilePage() {
  return <main><PageHeader eyebrow="PERSONAL CENTER" title="个人中心" description="角色不同，个人中心会显示不同的上报、活动、关注、调研成果和审核信息。" /><section className="page-container page-section"><ProfileDashboard /></section></main>;
}
