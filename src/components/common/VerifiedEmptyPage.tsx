import Link from "next/link";
import { Database, Home } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";

export function VerifiedEmptyPage({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <main>
      <PageHeader eyebrow={eyebrow} title={title} description="该板块目前没有经过核实并可公开展示的资料。" />
      <section className="page-container page-section">
        <div className="content-card empty-state">
          <Database size={36} />
          <h2>暂无已核实内容</h2>
          <p>原有预置示例已经清除。后续取得实际资料并完成核对后，再开放本板块内容。</p>
          <Link className="button button-primary" href="/"><Home size={17} />返回首页</Link>
        </div>
      </section>
    </main>
  );
}
