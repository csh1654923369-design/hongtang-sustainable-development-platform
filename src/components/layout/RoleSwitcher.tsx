"use client";

import { ChevronDown, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { contentService } from "@/services/content";
import { useDemo } from "@/components/providers/DemoProvider";

const roles = contentService.getRoles();

export function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const { role, setRole } = useDemo();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const current = roles.find((item) => item.id === role) ?? roles[0];

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="role-switcher" ref={wrapperRef}>
      <button className="role-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="listbox">
        <span className="avatar-mini"><UserRound size={17} /></span>
        {!compact ? <span><small>演示角色</small><strong>{current.shortLabel}</strong></span> : null}
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open ? (
        <div className="role-menu" role="listbox" aria-label="选择演示角色">
          <div className="role-menu-heading">切换演示身份</div>
          {roles.map((item) => (
            <button
              key={item.id}
              className={item.id === role ? "active" : ""}
              onClick={() => {
                setRole(item.id);
                setOpen(false);
              }}
              role="option"
              aria-selected={item.id === role}
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
