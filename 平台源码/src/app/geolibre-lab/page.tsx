import Link from "next/link";
import { ArrowLeft, FlaskConical, RefreshCw } from "lucide-react";

export const metadata = {
  title: "红塘空间数据编辑器｜红塘村可持续发展平台",
  description: "编辑、整理并导出红塘村点、线、面矢量数据。",
};

export default function GeoLibreLabPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const projectUrl = supabaseUrl
    ? `${supabaseUrl}/functions/v1/geolibre-bridge?format=project`
    : "";
  const geoLibreUrl = projectUrl
    ? `/geolibre/index.html?url=${encodeURIComponent(projectUrl)}&layout=compact&profile=hongtang-vector&locale=zh&theme=light&welcome=0`
    : "";

  return (
    <main className="geolibre-lab">
      <header className="geolibre-lab-header">
        <div className="geolibre-lab-heading">
          <Link className="geolibre-lab-back" href="/" title="返回红塘平台">
            <ArrowLeft aria-hidden="true" size={19} />
            <span>返回平台</span>
          </Link>
          <div className="geolibre-lab-title">
            <span className="geolibre-lab-icon" aria-hidden="true">
              <FlaskConical size={21} />
            </span>
            <div>
              <div className="geolibre-lab-title-line">
                <h1>红塘空间数据编辑器</h1>
              </div>
              <p>点、线、面绘制 · 要素编辑 · 属性与样式 · 导入与导出</p>
            </div>
          </div>
        </div>

      </header>

      <div className="geolibre-lab-notice" role="note">
        <RefreshCw aria-hidden="true" size={16} />
        <span>
          每次打开都会读取 Supabase 最新数据；编辑结果请导出保存，当前不会自动覆盖正式平台数据。
        </span>
      </div>

      {geoLibreUrl ? (
        <iframe
          className="geolibre-lab-frame"
          src={geoLibreUrl}
          title="红塘村空间数据编辑器"
          allow="fullscreen; geolocation; clipboard-read; clipboard-write"
        />
      ) : (
        <section className="geolibre-lab-error">
          <h2>暂时无法连接 Supabase</h2>
          <p>请先为当前运行环境配置 NEXT_PUBLIC_SUPABASE_URL，再重新打开本页。</p>
        </section>
      )}
    </main>
  );
}
