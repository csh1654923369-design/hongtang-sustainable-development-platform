import { IssueStatusHistory, ProjectUpdate } from "@/types";

type TimelineItem = IssueStatusHistory | ProjectUpdate;

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((item, index) => (
        <li key={item.id}><span className="timeline-dot">{index + 1}</span><div><time>{"date" in item ? item.date : ""}</time><strong>{item.title}</strong><p>{"description" in item ? item.description : item.content}</p><small>{"operator" in item ? item.operator : item.author}</small></div></li>
      ))}
    </ol>
  );
}
