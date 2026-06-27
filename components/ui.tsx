"use client";

import React from "react";

type Tone = "brand" | "success" | "warning" | "danger" | "info" | "muted";

const toneBadge: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  success: "bg-success-bg text-success ring-emerald-100",
  warning: "bg-warning-bg text-warning ring-amber-100",
  danger: "bg-danger-bg text-danger ring-rose-100",
  info: "bg-info-bg text-info ring-sky-100",
  muted: "bg-surface-2 text-muted ring-line",
};

export function Badge({
  children,
  tone = "muted",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneBadge[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return (
    <Tag
      className={`rounded-xl border border-line bg-surface shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  desc,
  action,
}: {
  title: React.ReactNode;
  desc?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {desc && <p className="mt-0.5 text-[13px] text-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "accent" | "danger";
const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-soft active:bg-ink-soft",
  secondary: "bg-surface text-ink-soft border border-line hover:bg-surface-2",
  ghost: "text-ink-soft hover:bg-surface-2",
  accent: "bg-brand text-[#1a1305] hover:bg-brand-600 active:bg-brand-600",
  danger: "bg-danger text-white hover:opacity-90",
};
const btnSizes = {
  sm: "h-8 px-3",
  md: "h-9.5 px-4",
  lg: "h-11 px-5 text-[15px]",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: {
  children: React.ReactNode;
  variant?: BtnVariant;
  size?: keyof typeof btnSizes;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${btnBase} ${btnVariants[variant]} ${btnSizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-faint outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-faint outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="px-5 py-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div
        className={`mt-1 text-2xl font-bold tracking-tight tnum ${
          tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-ink"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-faint">{sub}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && <div className="text-faint">{icon}</div>}
      <h4 className="text-[15px] font-semibold text-ink">{title}</h4>
      {desc && <p className="max-w-sm text-[13px] text-muted">{desc}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Divider() {
  return <div className="h-px w-full bg-line-soft" />;
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
