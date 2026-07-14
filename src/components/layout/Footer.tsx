import Link from "next/link";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-main page-container">
        <div className="footer-about"><span className="brand-seal">红</span><div><strong>红塘村可持续发展平台</strong><p>共同记录村庄，共同参与行动，共同见证改变。</p><DemoDataBadge label="当前为演示版本" /></div></div>
        <div className="footer-links"><div><strong>平台</strong><Link href="/village">认识红塘</Link><Link href="/goals">可持续目标</Link><Link href="/map">行动地图</Link></div><div><strong>参与</strong><Link href="/report">问题上报</Link><Link href="/participate">公众参与</Link><Link href="/research">调研提交</Link></div><div><strong>说明</strong><Link href="#">隐私说明</Link><Link href="#">使用帮助</Link><Link href="/admin">管理入口</Link></div></div>
      </div>
      <div className="footer-bottom page-container"><span>数据更新时间：2026年7月13日 · 所有数值均为演示数据</span><span>联系方式：待补充</span></div>
    </footer>
  );
}
