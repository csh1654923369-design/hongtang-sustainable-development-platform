"use client";

import { ArrowUpRight, CalendarDays, ClipboardPenLine, MapPinPlus, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/components/providers/DemoProvider";
import { Permission, can } from "@/lib/permissions";

const icons = { report: MapPinPlus, project: ClipboardPenLine, activity: CalendarDays, research: UploadCloud };

export function QuickActionCard({ icon, title, description, href, permission }: { icon: keyof typeof icons; title: string; description: string; href: string; permission?: Permission }) {
  const Icon = icons[icon];
  const router = useRouter();
  const { role, notify } = useDemo();
  const activate = () => {
    if (permission && !can(role, permission)) {
      notify("当前身份暂不能使用此功能", permission === "reportIssue" ? "请切换为村民角色或登录后提交。" : "请切换到具备相应权限的演示角色。");
      return;
    }
    router.push(href);
  };
  return (
    <button className="quick-action-card" onClick={activate}>
      <span className="quick-icon"><Icon size={24} /></span>
      <span><strong>{title}</strong><small>{description}</small></span>
      <ArrowUpRight size={20} className="card-arrow" />
    </button>
  );
}
