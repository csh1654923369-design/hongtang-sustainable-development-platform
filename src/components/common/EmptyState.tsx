import { Inbox } from "lucide-react";

export function EmptyState({ title = "暂无内容", description = "当前筛选条件下没有找到内容。" }: { title?: string; description?: string }) {
  return (
    <div className="empty-state">
      <Inbox size={34} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
