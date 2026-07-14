import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { IssueReport } from "@/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";

export function IssueCard({ issue }: { issue: IssueReport }) {
  return (
    <article className="issue-card">
      <div className="issue-card-top"><span className="issue-code">{issue.code}</span><StatusBadge status={issue.status} /></div>
      <div className="inline-badges"><DemoDataBadge /><span className="soft-tag">{issue.type}</span>{issue.urgent ? <span className="urgent-tag">需要尽快处理</span> : null}</div>
      <h3>{issue.title}</h3><p>{issue.description}</p>
      <div className="issue-meta"><span><MapPin size={15} />{issue.location}</span><span><CalendarDays size={15} />{issue.submittedAt}</span></div>
      <Link href={`/issues/${issue.id}`}>查看办理详情 <ArrowRight size={16} /></Link>
    </article>
  );
}
