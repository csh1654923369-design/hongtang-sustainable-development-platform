import { PageHeader } from "@/components/common/PageHeader";
import { ResearchSubmissionForm } from "@/components/research/ResearchSubmissionForm";

export default function ResearchPage() {
  return <main><PageHeader eyebrow="RESEARCH SUBMISSION" title="提交调研成果" description="学生和规划协作者可以提交照片、空间数据、访谈记录与改造建议，所有内容先进入专业审核。" /><section className="page-container page-section research-page"><ResearchSubmissionForm /></section></main>;
}
