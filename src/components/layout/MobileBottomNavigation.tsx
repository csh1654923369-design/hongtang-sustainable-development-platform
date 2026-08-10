"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Sprout, UserRound } from "lucide-react";

const items = [
  { href: "/", label: "首页", icon: Home },
  { href: "/village-overview#village-topics", label: "选事项", icon: Sprout, topicEntry: true },
  { href: "/map", label: "一张图", icon: Map },
  { href: "/profile", label: "我的", icon: UserRound },
];

const topicRoutes = ["/village-overview", "/garden", "/tea-factory", "/water", "/safety", "/village-history"];

export function MobileBottomNavigation() {
  const pathname = usePathname();
  return (
    <nav className="mobile-bottom-nav" aria-label="移动端主导航">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.topicEntry ? topicRoutes.some((route) => pathname.startsWith(route)) : item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} className={active ? "active" : ""}><Icon size={20} /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}
