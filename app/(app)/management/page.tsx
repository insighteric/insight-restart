"use client";

import { useMemo, useState } from "react";
import { BarChart3, TrendingUp, FileSignature, AlertTriangle, Lock, Wallet, Banknote } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Badge, Stat, EmptyState } from "@/components/ui";
import { won, manwon, caseTypeLabel, stageLabel } from "@/lib/format";
import {
  collectedPayments, sumInRange, casesInRange, contractedValue, monthlySeries, lastMonths, receivables,
} from "@/lib/analytics";

const today = () => new Date().toISOString().slice(0, 10);
const mondayOf = (iso: string) => {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7; // 월=0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
};
const monthStart = (iso: string) => iso.slice(0, 8) + "01";
const minusDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

type Preset = "today" | "week" | "month" | "q" | "all" | "custom";

export default function ManagementPage() {
  const store = useStore();
  const { can } = useAuth();
  const t = today();
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState(monthStart(t));
  const [to, setTo] = useState(t);

  const range = useMemo(() => {
    switch (preset) {
      case "today": return { from: t, to: t };
      case "week": return { from: mondayOf(t), to: t };
      case "month": return { from: monthStart(t), to: t };
      case "q": return { from: minusDays(t, 90), to: t };
      case "all": return { from: "2000-01-01", to: t };
      case "custom": return { from, to };
    }
  }, [preset, from, to, t]);

  const paid = useMemo(() => collectedPayments(store.feePlans), [store.feePlans]);
  const revenue = useMemo(() => sumInRange(paid, range.from, range.to), [paid, range]);
  const newCases = useMemo(() => casesInRange(store.cases, range.from, range.to), [store.cases, range]);
  const newValue = useMemo(() => contractedValue(newCases, store.feePlans), [newCases, store.feePlans]);
  const recv = useMemo(() => receivables(store.feePlans), [store.feePlans]);
  const months = useMemo(() => monthlySeries(store.feePlans, store.cases, lastMonths(t, 6)), [store.feePlans, store.cases, t]);

  // 사건 단계/상태 분포
  const stageDist = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of store.cases) if (c.status === "active") m[c.stage] = (m[c.stage] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [store.cases]);

  if (!can("dashboard")) {
    return (
      <div>
        <PageHeader title="경영 대시보드" desc="운영·회계 통계" />
        <Card><EmptyState icon={<Lock size={30} />} title="접근 권한이 없습니다" desc="‘경영 대시보드’ 권한이 있는 계정만 열람할 수 있습니다. 대표(관리자)에게 권한을 요청하세요." /></Card>
      </div>
    );
  }

  const showRevenue = can("revenue");
  const showRecv = can("receivables");
  const showContracts = can("contracts");
  const maxRev = Math.max(1, ...months.map((m) => m.revenue));
  const maxCon = Math.max(1, ...months.map((m) => m.contracts));

  const presets: { k: Preset; label: string }[] = [
    { k: "today", label: "오늘" }, { k: "week", label: "이번주" }, { k: "month", label: "이번달" },
    { k: "q", label: "최근 3개월" }, { k: "all", label: "전체" }, { k: "custom", label: "기간 지정" },
  ];

  return (
    <div>
      <PageHeader title="경영 대시보드" desc="매출·계약·미수금 등 운영·회계 통계" action={<Badge tone="brand"><BarChart3 size={11} /> 관리자</Badge>} />

      {/* 기간 선택 */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 p-4">
          {presets.map((p) => (
            <button key={p.k} onClick={() => setPreset(p.k)}
              className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${preset === p.k ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"}`}>
              {p.label}
            </button>
          ))}
          {preset === "custom" && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px] outline-none focus:border-brand-300" />
              <span className="text-faint">~</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px] outline-none focus:border-brand-300" />
            </div>
          )}
          <span className="ml-auto text-[12px] text-faint">{range.from} ~ {range.to}</span>
        </div>
      </Card>

      {/* KPI */}
      <Card className="mb-4">
        <div className="grid grid-cols-2 divide-x divide-y divide-line-soft md:grid-cols-4 md:divide-y-0">
          {showRevenue
            ? <Stat label="기간 매출(수금)" value={won(revenue)} tone="success" sub="납입 완료 합계" />
            : <LockedStat label="기간 매출" />}
          {showContracts
            ? <Stat label="신규 계약" value={`${newCases.length}건`} sub={`약정액 ${manwon(newValue)}`} />
            : <LockedStat label="신규 계약" />}
          {showRecv
            ? <Stat label="미수금(현재)" value={won(recv.outstanding)} tone={recv.outstanding ? "danger" : "success"} sub={`연체 ${won(recv.overdue)}`} />
            : <LockedStat label="미수금" />}
          <Stat label="진행 사건" value={`${store.cases.filter((c) => c.status === "active").length}건`} sub={`전체 ${store.cases.length}건`} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 월별 매출 추이 */}
        {showRevenue && (
          <Card>
            <CardHeader title="월별 매출 추이" desc="최근 6개월 수금액" action={<TrendingUp size={15} className="text-success" />} />
            <div className="flex h-44 items-end gap-2 p-5">
              {months.map((m) => (
                <div key={m.ym} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="text-[10px] font-semibold text-ink-soft tnum">{m.revenue ? manwon(m.revenue) : ""}</div>
                  <div className="flex w-full items-end" style={{ height: "110px" }}>
                    <div className="w-full rounded-t bg-success/80" style={{ height: `${(m.revenue / maxRev) * 100}%`, minHeight: m.revenue ? 3 : 0 }} />
                  </div>
                  <div className="text-[11px] text-muted">{m.label}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 월별 신규 계약 */}
        {showContracts && (
          <Card>
            <CardHeader title="월별 신규 계약(수임)" desc="최근 6개월" action={<FileSignature size={15} className="text-brand" />} />
            <div className="flex h-44 items-end gap-2 p-5">
              {months.map((m) => (
                <div key={m.ym} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="text-[10px] font-semibold text-ink-soft tnum">{m.contracts || ""}</div>
                  <div className="flex w-full items-end" style={{ height: "110px" }}>
                    <div className="w-full rounded-t bg-brand" style={{ height: `${(m.contracts / maxCon) * 100}%`, minHeight: m.contracts ? 3 : 0 }} />
                  </div>
                  <div className="text-[11px] text-muted">{m.label}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 미수금 상위 */}
        {showRecv && (
          <Card>
            <CardHeader title="미수금 상위" desc={`총 ${recv.byCase.length}건 · 연체 ${recv.overdueCount}건`} action={<AlertTriangle size={15} className="text-danger" />} />
            {recv.byCase.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-muted">미수금이 없습니다. 👍</div>
            ) : (
              <div className="divide-y divide-line-soft">
                {recv.byCase.slice(0, 8).map((r) => {
                  const c = store.caseById(r.caseId);
                  const cl = c ? store.clientById(c.clientId) : undefined;
                  return (
                    <div key={r.caseId} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">{cl?.name ?? "의뢰인"} <span className="text-faint">· {c ? caseTypeLabel[c.type] : ""}</span></span>
                      {r.overdue > 0 && <Badge tone="danger">연체 {won(r.overdue)}</Badge>}
                      <span className="font-semibold tabular-nums text-danger">{won(r.unpaid)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* 진행 단계 분포 */}
        <Card>
          <CardHeader title="진행 단계 분포" desc="진행 중 사건" action={<Wallet size={15} className="text-faint" />} />
          <div className="space-y-2.5 p-5">
            {stageDist.length === 0 ? (
              <div className="py-4 text-center text-[13px] text-muted">진행 중 사건이 없습니다.</div>
            ) : stageDist.map(([stage, n]) => {
              const max = stageDist[0][1];
              return (
                <div key={stage}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="text-ink-soft">{stageLabel[stage as keyof typeof stageLabel] ?? stage}</span>
                    <span className="font-semibold tnum">{n}건</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-faint">
        <Banknote size={12} /> 매출은 분납관리에서 ‘완납 처리’된 수임료 기준입니다. 항목별 표시는 계정 권한에 따라 다를 수 있습니다.
      </p>
    </div>
  );
}

function LockedStat({ label }: { label: string }) {
  return (
    <div className="flex flex-col justify-center gap-1 px-5 py-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="flex items-center gap-1 text-[13px] text-faint"><Lock size={13} /> 권한 없음</div>
    </div>
  );
}
