"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Scale } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Card, Button, Badge, EmptyState } from "@/components/ui";
import { CaseTypeBadge, CaseStatusBadge } from "@/components/CaseBits";
import { NewCaseDialog } from "@/components/NewCaseDialog";
import { stageLabel, manwon } from "@/lib/format";
import { totalDebt } from "@/lib/calc";
import type { CaseType } from "@/lib/types";

type Filter = "all" | CaseType;

export default function CasesPage() {
  const { cases, clientById } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (filter !== "all" && c.type !== filter) return false;
      if (!q) return true;
      const cl = clientById(c.clientId);
      const hay = `${cl?.name} ${cl?.phone} ${c.court} ${c.caseNo ?? ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [cases, filter, q, clientById]);

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "전체", count: cases.length },
    { key: "rehab", label: "개인회생", count: cases.filter((c) => c.type === "rehab").length },
    { key: "bankruptcy", label: "개인파산", count: cases.filter((c) => c.type === "bankruptcy").length },
  ];

  return (
    <div>
      <PageHeader
        title="사건 관리"
        desc="의뢰인별 개인회생·파산 사건을 단계별로 관리합니다."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> 새 사건
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                filter === t.key ? "bg-brand-50 text-brand-700" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-faint">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="의뢰인·법원·사건번호"
            className="h-9.5 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Scale size={32} />}
            title="사건이 없습니다"
            desc="새 사건을 추가해 의뢰인 정보와 채무·재산을 등록하세요."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus size={16} /> 새 사건 추가
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-line-soft">
            <div className="hidden grid-cols-12 gap-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint md:grid">
              <div className="col-span-3">의뢰인</div>
              <div className="col-span-3">법원 · 사건번호</div>
              <div className="col-span-2">단계</div>
              <div className="col-span-2 text-right">총 채무</div>
              <div className="col-span-2 text-right">상태</div>
            </div>
            {filtered.map((c) => {
              const cl = clientById(c.clientId);
              return (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="grid grid-cols-2 items-center gap-2 px-5 py-3.5 transition-colors hover:bg-surface-2 md:grid-cols-12"
                >
                  <div className="col-span-2 flex items-center gap-3 md:col-span-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                      {cl?.name?.[0] ?? "?"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink">{cl?.name}</span>
                        <CaseTypeBadge type={c.type} />
                      </div>
                      <div className="text-xs text-muted">{cl?.phone}</div>
                    </div>
                  </div>
                  <div className="col-span-3 hidden md:block">
                    <div className="text-sm text-ink-soft">{c.court}</div>
                    <div className="text-xs text-muted">{c.caseNo ?? "미접수"}</div>
                  </div>
                  <div className="col-span-2 hidden md:block">
                    <Badge tone="muted">{stageLabel[c.stage]}</Badge>
                  </div>
                  <div className="col-span-2 hidden text-right text-sm font-semibold tabular-nums text-ink md:block">
                    {manwon(totalDebt(c.creditors))}
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <CaseStatusBadge status={c.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <NewCaseDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
