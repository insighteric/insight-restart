"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  desc,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  desc?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const maxW = size === "xl" ? "max-w-3xl" : size === "lg" ? "max-w-xl" : "max-w-md";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${maxW} max-h-[92vh] overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-[var(--shadow-pop)] animate-in sm:rounded-2xl`}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-line-soft bg-surface px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            {desc && <p className="mt-0.5 text-[13px] text-muted">{desc}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line-soft bg-surface px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
