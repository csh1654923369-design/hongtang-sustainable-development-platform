"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button modal-close" onClick={onClose} aria-label="关闭弹窗">
          <X size={20} />
        </button>
        <h2 id="dialog-title">{title}</h2>
        {description ? <p className="modal-description">{description}</p> : null}
        {children}
        {onConfirm ? (
          <div className="modal-actions">
            <button className="button button-secondary" onClick={onClose}>取消</button>
            <button className="button button-primary" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
