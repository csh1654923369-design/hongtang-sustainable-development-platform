import { IssueStatus, ProjectStatus, ReviewStatus } from "@/types";
import { issueStatusLabels, projectStatusLabels, reviewStatusLabels } from "@/lib/utils";

type Status = IssueStatus | ProjectStatus | ReviewStatus | string;

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const text =
    label ??
    issueStatusLabels[status as IssueStatus] ??
    projectStatusLabels[status as ProjectStatus] ??
    reviewStatusLabels[status as ReviewStatus] ??
    String(status);

  return <span className={`status-badge status-${status}`}>{text}</span>;
}
