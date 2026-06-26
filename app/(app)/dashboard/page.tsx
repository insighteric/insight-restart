"use client";

import Link from "next/link";
import {
  Scale,
  AlertTriangle,
  ClipboardCheck,
  CalendarClock,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Stat, Badge, Button } from "@/components/ui";
import { CaseTypeBadge, CaseStatusBadge } from "@/components/CaseBits";
import {
  formatDate,
  ddayLabel,
  daysUntil,
  stageLabel,
  eventTypeLabel,
  eventTypeColor,
} from "@/lib/format";

export default function DashboardPage() {
  const { cases, clients, corrections, events, clientById } = useStore();

  const activeCases = cases.filter((c) => c.status === "active");
  const upcoming = [...events]
    .filter((e) => !e.done && daysUntil(e.date)! >= -1)
    .sort((a, b) => a.date.localeCompare(b.date));
  const dueSoon = upcoming.filter((e) => (daysUntil(e.date) ?? 99) <= 7);
  const openCorrections = corrections.filter((c) => c.status !== "submitted");
  const newThisMonth = cases.filter((c) => {
    const d = new Date(c.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  return (
    <div>
      <PageHeader
        title="대시보드"
        desc={`오늘 ${formatDate(new Date().toISOString())} · 진행 중인 사건과 임박한 기한을 한눈에 확인하세요.`}
        action={
          <Link href="/corrections">
            <Button>
              <Sparkles size={16} /> 보정명령 처리
            </Button>
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <Stat
            label="진행 중 사건"
            value={activeCases.length}
            sub={`전체 ${cases.length}건`}
          />
        </Card>
        <Card>
          <Stat
            label="7일 내 기한"
            value={dueSoon.length}
            tone={dueSoon.length ? "danger" : undefined}
            sub="보정·기일·마감"
          />
        </Card>
        <Card>
          <Stat label="보정 진행" value={openCorrections.length} sub="제출 대기 포함" />
        </Card>
        <Card>
          <Stat label="이번 달 신규" value={newThisMonth.length} sub={`의뢰인 ${clients.length}명`} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* 임박 기한 */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="임박한 기한"
            desc="기한이 가까운 순으로 정렬됩니다."
            action={
              <Link href="/schedule" className="text-[13px] font-semibold text-brand hover:underline">
                전체보기
              </Link>
            }
          />
          <ul className="divide-y divide-line-soft">
            {upcoming.slice(0, 6).map((e) => {
              const dday = daysUntil(e.date) ?? 0;
              const urgent = dday <= 3;
              const c = e.caseId ? cases.find((x) => x.id === e.caseId) : undefined;
              return (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-center ${
                      urgent ? "bg-danger-bg text-danger" : "bg-surface-2 text-ink-soft"
                    }`}
                  >
                    <span className="text-[10px] leading-none">{eventTypeLabel[e.type]}</span>
                    <span className="text-[13px] font-bold leading-tight">{ddayLabel(e.date)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">{e.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <span>{formatDate(e.date)}</span>
                      {c && (
                        <>
                          <span className="text-line">·</span>
                          <Link href={`/cases/${c.id}`} className="hover:text-brand hover:underline">
                            {clientById(c.clientId)?.name} {c.caseNo ?? ""}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge tone={eventTypeColor[e.type] as never}>{eventTypeLabel[e.type]}</Badge>
                </li>
              );
            })}
            {upcoming.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted">임박한 기한이 없습니다.</li>
            )}
          </ul>
        </Card>

        {/* 보정 진행 현황 */}
        <Card>
          <CardHeader
            title="보정 진행"
            action={
              <Link href="/corrections" className="text-[13px] font-semibold text-brand hover:underline">
                처리
              </Link>
            }
          />
          <div className="space-y-3 p-4">
            {openCorrections.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">진행 중인 보정이 없습니다.</p>
            )}
            {openCorrections.map((co) => {
              const c = cases.find((x) => x.id === co.caseId);
              const total = co.items.length;
              const done = co.items.filter((i) => i.done).length;
              const dday = daysUntil(co.dueAt) ?? 0;
              return (
                <Link
                  key={co.id}
                  href="/corrections"
                  className="block rounded-lg border border-line p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">
                      {c ? clientById(c.clientId)?.name : "사건"} 보정
                    </span>
                    <Badge tone={dday <= 3 ? "danger" : "warning"}>{ddayLabel(co.dueAt)}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted">{co.court}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(done / total) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] tabular-nums text-muted">
                      {done}/{total}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 최근 사건 */}
      <Card className="mt-4">
        <CardHeader
          title="최근 사건"
          action={
            <Link href="/cases" className="text-[13px] font-semibold text-brand hover:underline">
              사건 관리
            </Link>
          }
        />
        <div className="divide-y divide-line-soft">
          {cases.slice(0, 5).map((c) => {
            const cl = clientById(c.clientId);
            return (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                  {cl?.name?.[0] ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{cl?.name}</span>
                    <CaseTypeBadge type={c.type} />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {c.court} {c.caseNo ? `· ${c.caseNo}` : ""} · {cl?.job}
                  </div>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <Badge tone="muted">{stageLabel[c.stage]}</Badge>
                  <CaseStatusBadge status={c.status} />
                </div>
                <ArrowRight size={16} className="text-faint" />
              </Link>
            );
          })}
        </div>
      </Card>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-faint">
        <TrendingUp size={13} /> 데모 데이터로 동작 중입니다. 실제 사건을 추가하면 즉시 반영됩니다.
      </p>
    </div>
  );
}
