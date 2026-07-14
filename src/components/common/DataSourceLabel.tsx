import { Database } from "lucide-react";

export function DataSourceLabel({ source, updatedAt }: { source: string; updatedAt?: string }) {
  return (
    <div className="data-source">
      <Database size={14} aria-hidden="true" />
      <span>来源：{source}</span>
      {updatedAt ? <span>更新：{updatedAt}</span> : null}
    </div>
  );
}
