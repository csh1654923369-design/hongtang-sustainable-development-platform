"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search, X, MapPinPlus, Box } from "lucide-react";
import { useState } from "react";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";
import { contentService } from "@/services/content";
import { UserRole } from "@/types";

const navigation = [
  { href: "/", label: "首页" },
  { href: "/village", label: "认识红塘" },
  { href: "/goals", label: "可持续目标" },
  { href: "/map", label: "行动地图" },
  { href: "/projects", label: "项目与行动" },
  { href: "/progress", label: "发展进展" },
  { href: "/participate", label: "公众参与" },
  { href: "/profile", label: "个人中心" },
];

const searchItems = [
  { label: "村口公共空间微更新", href: "/projects/gateway-public-space", type: "项目" },
  { label: "村内水环境改善行动", href: "/projects/water-environment", type: "项目" },
  { label: "村庄行动地图", href: "/map", type: "功能" },
  { label: "宜居环境改善", href: "/goals/goal-livable", type: "目标" },
  { label: "问题 HT-2026-0005", href: "/issues/issue-1", type: "问题" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, notify } = useDemo();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const notifications = contentService.getNotifications();
  const results = searchItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  const report = () => {
    if (!can(role, "reportIssue")) {
      notify("当前身份不能正式上报", "请从右上角切换为村民角色后继续。");
      return;
    }
    router.push("/report");
  };

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <Link href="/" className="platform-brand" aria-label="红塘村可持续发展平台首页">
            <span className="brand-seal">红</span>
            <span className="brand-copy"><strong>红塘村可持续发展平台</strong><small>HONGTANG VILLAGE · SUSTAINABLE DEVELOPMENT</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="主导航">
            {navigation.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return <Link key={item.href} href={item.href} className={active ? "active" : ""}>{item.label}</Link>;
            })}
          </nav>
          <div className="header-actions">
            <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="搜索平台内容"><Search size={19} /></button>
            <div className="popover-wrap">
              <button className="icon-button notification-button" onClick={() => setNotificationsOpen((value) => !value)} aria-label="查看通知">
                <Bell size={19} /><span className="notification-dot">2</span>
              </button>
              {notificationsOpen ? (
                <div className="notification-panel">
                  <div className="popover-title"><strong>消息通知</strong><span>演示数据</span></div>
                  {notifications.map((item) => <Link href={item.href ?? "#"} key={item.id} onClick={() => setNotificationsOpen(false)} className={!item.read ? "unread" : ""}><strong>{item.title}</strong><span>{item.content}</span><small>{item.createdAt}</small></Link>)}
                </div>
              ) : null}
            </div>
            <RoleSwitcher />
            {role === UserRole.Admin ? <Link href="/admin" className="button button-admin"><Box size={17} />后台</Link> : null}
            <button className="button button-report" onClick={report}><MapPinPlus size={18} />我要上报</button>
            <button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="打开菜单"><Menu size={22} /></button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="移动导航">
          <div className="mobile-menu-head"><span>网站导航</span><button className="icon-button" onClick={() => setMobileOpen(false)} aria-label="关闭菜单"><X size={21} /></button></div>
          <RoleSwitcher />
          <nav>{navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>{item.label}</Link>)}<Link href="/research" onClick={() => setMobileOpen(false)}>提交调研成果</Link><Link href="/digital-twin" onClick={() => setMobileOpen(false)}>数字沙盘</Link>{role === UserRole.Admin ? <Link href="/admin" onClick={() => setMobileOpen(false)}>管理员后台</Link> : null}</nav>
        </div>
      ) : null}

      {searchOpen ? (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="搜索平台内容">
          <div className="search-dialog">
            <div className="search-input-wrap"><Search size={22} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目、目标、问题……" aria-label="搜索关键词" /><button className="icon-button" onClick={() => setSearchOpen(false)} aria-label="关闭搜索"><X size={20} /></button></div>
            <div className="search-results">
              {results.map((item) => <Link href={item.href} key={item.href} onClick={() => setSearchOpen(false)}><span>{item.type}</span><strong>{item.label}</strong></Link>)}
              {results.length === 0 ? <p>没有找到相关演示内容。</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
