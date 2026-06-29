"use client";

import Link from "next/link";
import { ShieldCheck, Users, BarChart3, Wallet, Lock, ChevronRight, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Card, Badge, EmptyState } from "@/components/ui";

interface Tile {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  perm: string;
}

export default function AdminPage() {
  const { can, isAdmin, role } = useAuth();
  const anyAdmin = isAdmin || can("members") || can("dashboard") || can("payments");

  if (!anyAdmin) {
    return (
      <div>
        <PageHeader title="관리자 모드" desc="운영·회계·회원 관리" />
        <Card><EmptyState icon={<Lock size={30} />} title="접근 권한이 없습니다" desc="관리자 모드는 대표(관리자) 또는 권한을 받은 계정만 사용할 수 있습니다." /></Card>
      </div>
    );
  }

  const tiles: Tile[] = [
    { href: "/members", icon: <Users size={22} />, title: "회원 관리 · 권한 설정", desc: "직원을 관리자로 지정/해제하고, 항목별 권한을 선별 부여합니다.", perm: "members" },
    { href: "/management", icon: <BarChart3 size={22} />, title: "경영 대시보드", desc: "매출·계약·미수금 등 운영·회계 통계를 기간별로 봅니다.", perm: "dashboard" },
    { href: "/payments", icon: <Wallet size={22} />, title: "분납 · 미수금 관리", desc: "수임료 분납계획·완납 처리·연체 현황을 관리합니다.", perm: "payments" },
    { href: "/manual-print", icon: <Printer size={22} />, title: "매뉴얼 인쇄 · PDF", desc: "사용설명서를 인쇄하거나 PDF로 저장합니다.", perm: "print" },
  ];
  const available = tiles.filter((t) => can(t.perm));

  return (
    <div>
      <PageHeader
        title="관리자 모드"
        desc="운영·회계·회원 관리를 한 곳에서"
        action={<Badge tone="brand"><ShieldCheck size={12} /> {role === "owner" || isAdmin ? "ADMIN" : "권한 보유"}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {available.map((t) => (
          <Link key={t.href} href={t.href} target={t.href === "/manual-print" ? "_blank" : undefined}>
            <Card className="h-full transition-shadow hover:shadow-[var(--shadow-pop)]">
              <div className="flex items-start gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{t.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[15px] font-bold text-ink">{t.title}</h3>
                    <ChevronRight size={18} className="shrink-0 text-faint" />
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{t.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {available.length < tiles.length && (
        <p className="mt-4 text-[12px] text-faint">
          ※ 권한이 없는 항목은 표시되지 않습니다. 추가 권한이 필요하면 대표(관리자)에게 ‘회원 관리 · 권한 설정’에서 부여를 요청하세요.
        </p>
      )}
    </div>
  );
}
