"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, Home, Map, UserRound, UsersRound } from "lucide-react";

const items = [
  { href: "/", label: "首页", icon: Home },
  { href: "/map", label: "地图", icon: Map },
  { href: "/participate", label: "参与", icon: UsersRound },
  { href: "/projects", label: "项目", icon: FolderKanban },
  { href: "/profile", label: "我的", icon: UserRound },
];

export function MobileBottomNavigation() {
  const pathname = usePathname();
  return (
    <nav className="mobile-bottom-nav" aria-label="移动端主导航">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} className={active ? "active" : ""}><Icon size={20} /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}
