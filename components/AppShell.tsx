"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Scale,
  Users,
  ClipboardCheck,
  FileText,
  ReceiptText,
  CalendarClock,
  Calculator,
  Wrench,
  Settings,
  Sparkles,
  Search,
  Bell,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Badge } from "./ui";

const NAV: {
  href: string;
  label: string;
  icon: React.ElementType;
  ai?: boolean;
}[] = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/cases", label: "사건 관리", icon: Scale },
  { href: "/clients", label: "의뢰인", icon: Users },
  { href: "/corrections", label: "보정명령", icon: ClipboardCheck, ai: true },
  { href: "/documents", label: "AI 서류작성", icon: FileText, ai: true },
  { href: "/analyze", label: "거래내역 분석", icon: ReceiptText, ai: true },
  { href: "/schedule", label: "일정·기한", icon: CalendarClock },
  { href: "/calculators", label: "변제 계산기", icon: Calculator },
  { href: "/tools", label: "PDF 도구", icon: Wrench },
  { href: "/settings", label: "설정·구독", icon: Settings },
];

const tierLabel: Record<string, string> = { free: "Free", pro: "Pro", team: "Team" };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { subscription } = useStore();
  const { firmName, configured, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <Scale size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold tracking-tight text-ink">회생ON</div>
            <div className="text-[10px] font-medium text-faint">개인회생·파산 AI 실무</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Icon size={17} className={active ? "text-brand" : "text-faint group-hover:text-muted"} />
                <span className="flex-1">{item.label}</span>
                {item.ai && (
                  <Sparkles size={13} className={active ? "text-brand" : "text-brand-300"} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-xl border border-line bg-surface-2 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">{tierLabel[subscription.tier]} 플랜</span>
            <Badge tone="brand">구독중</Badge>
          </div>
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>AI 크레딧</span>
              <span className="tnum">
                {subscription.aiCreditsUsed} / {subscription.aiCreditsLimit}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-brand"
                style={{
                  width: `${Math.min(100, (subscription.aiCreditsUsed / subscription.aiCreditsLimit) * 100)}%`,
                }}
              />
            </div>
          </div>
          <Link
            href="/settings"
            className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-brand py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
          >
            플랜 업그레이드 <ChevronRight size={13} />
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-5 backdrop-blur">
          {/* mobile brand */}
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
              <Scale size={15} />
            </div>
            <span className="font-extrabold text-ink">회생ON</span>
          </Link>

          <div className="relative hidden flex-1 sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              placeholder="의뢰인·사건번호·법원 검색"
              className="h-9.5 w-full max-w-md rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm outline-none placeholder:text-faint focus:border-brand-300 focus:bg-surface focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="relative flex h-9.5 w-9.5 items-center justify-center rounded-lg border border-line text-muted hover:bg-surface-2">
              <Bell size={17} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" />
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-line py-1 pl-1 pr-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-100 text-xs font-bold text-brand-700">
                {(firmName ?? "회")[0]}
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="text-[12.5px] font-semibold text-ink">담당 사무장</div>
                <div className="max-w-[130px] truncate text-[10px] text-faint">{firmName ?? "회생ON 법무사무소"}</div>
              </div>
              {configured && (
                <button
                  onClick={signOut}
                  title="로그아웃"
                  className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface-2 hover:text-danger"
                >
                  <LogOut size={15} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Mobile nav */}
        <MobileNav pathname={pathname} />

        <main className="min-w-0 flex-1 px-5 py-6 sm:px-7 lg:px-9">
          <div className="mx-auto w-full max-w-6xl animate-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 lg:hidden">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium ${
              active ? "bg-brand-50 text-brand-700" : "text-muted"
            }`}
          >
            <Icon size={15} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function PageHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {desc && <p className="mt-1 text-[13.5px] text-muted">{desc}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
