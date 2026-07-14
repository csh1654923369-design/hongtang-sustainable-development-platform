import { PageHeader } from "@/components/common/PageHeader";
import { IssueReportWizard } from "@/components/issues/IssueReportWizard";

export default function ReportPage() {
  return <main><PageHeader eyebrow="REPORT AN ISSUE" title="上报村庄问题" description="用五个清晰步骤记录位置、类型、现场情况与照片。提交内容先进入待审核状态。" /><div className="page-container report-page"><IssueReportWizard /></div></main>;
}
