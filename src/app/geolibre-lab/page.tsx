import Link from "next/link";
import { ArrowLeft, FlaskConical, RefreshCw } from "lucide-react";

export const metadata = {
  title: "GeoLibre 空间数据实验室｜红塘村可持续发展平台",
  description: "使用 GeoLibre 读取并试验编辑红塘村 Supabase 空间数据。",
};

export default function GeoLibreLabPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const projectUrl = supabaseUrl
    ? `${supabaseUrl}/functions/v1/geolibre-bridge?format=project`
    : "";
  const geoLibreUrl = projectUrl
    ? `/geolibre/index.html?url=${encodeURIComponent(projectUrl)}&layout=compact&locale=zh&theme=light&welcome=0`
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
                <h1>GeoLibre 空间数据实验室</h1>
                <span>试验功能</span>
              </div>
              <p>与红塘平台共用 Supabase 数据 · 当前为安全只读桥接</p>
            </div>
          </div>
        </div>

      </header>

      <div className="geolibre-lab-notice" role="note">
        <RefreshCw aria-hidden="true" size={16} />
        <span>
          每次打开都会读取 Supabase 最新数据；GeoLibre 内的修改目前只保存在本次项目或导出文件中，不会自动覆盖正式平台。
        </span>
      </div>

      {geoLibreUrl ? (
        <iframe
          className="geolibre-lab-frame"
          src={geoLibreUrl}
          title="红塘村 GeoLibre 空间数据实验室"
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
