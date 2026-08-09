"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <footer className="app-footer">
      <div className="footer-main page-container">
        <div className="footer-about"><span className="brand-seal">红</span><div><strong>红塘村可持续发展平台</strong><p>共同记录村庄，共同参与行动，共同见证改变。</p><DemoDataBadge label="当前为演示版本" /></div></div>
        <div className="footer-links"><div><strong>村民常用</strong><Link href="/village-life">村里的事</Link><Link href="/map">村里一张图</Link><Link href="/report">记录一件事</Link><Link href="/participate">参加村里活动</Link></div><div><strong>了解红塘</strong><Link href="/village">认识红塘</Link><Link href="/goals">可持续目标</Link><Link href="/progress">村里有什么变化</Link></div><div><strong>更多工具</strong><Link href="/projects">项目与行动</Link><Link href="/digital-twin">看看改造后的样子</Link><Link href="/research">调研资料提交</Link><Link href="/admin">管理入口</Link></div></div>
      </div>
      <div className="footer-bottom page-container"><span>数据更新时间：2026年7月13日 · 所有数值均为演示数据</span><span>联系方式：待补充</span></div>
    </footer>
  );
}
