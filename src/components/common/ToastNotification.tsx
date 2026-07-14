"use client";

import { CheckCircle2, Info, X } from "lucide-react";

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone?: "success" | "info";
}

export function ToastNotification({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const Icon = toast.tone === "success" ? CheckCircle2 : Info;
  return (
    <div className="toast" role="status" aria-live="polite">
      <Icon size={20} aria-hidden="true" />
      <div>
        <strong>{toast.title}</strong>
        {toast.description ? <p>{toast.description}</p> : null}
      </div>
      <button className="icon-button compact" onClick={onClose} aria-label="关闭提示">
        <X size={17} />
      </button>
    </div>
  );
}
