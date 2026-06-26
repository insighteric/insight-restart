"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Mail, MessageCircle, ArrowRight, Search, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Card, Badge, EmptyState } from "@/components/ui";
import { CaseTypeBadge } from "@/components/CaseBits";
import { stageLabel, formatDate } from "@/lib/format";

export default function ClientsPage() {
  const { clients, cases } = useStore();
  const [q, setQ] = useState("");

  const list = clients.filter((c) =>
    `${c.name} ${c.phone} ${c.email ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader title="의뢰인" desc="의뢰인별 연락처와 진행 사건을 관리합니다." />

      <div className="mb-4 flex justify-end">
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름·연락처·이메일"
            className="h-9.5 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<Users size={32} />} title="의뢰인이 없습니다" desc="사건을 등록하면 의뢰인이 자동으로 추가됩니다." />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((cl) => {
            const myCases = cases.filter((c) => c.clientId === cl.id);
            return (
              <Card key={cl.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-base font-bold text-brand-700">
                    {cl.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-ink">{cl.name}</div>
                    <div className="text-xs text-muted">{cl.job ?? "—"}</div>
                  </div>
                  {cl.kakaoId && (
                    <span className="flex h-7 items-center gap-1 rounded-md bg-[#FEE500] px-2 text-[11px] font-bold text-[#3C1E1E]">
                      <MessageCircle size={12} /> 카톡
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1.5 text-[13px] text-ink-soft">
                  <div className="flex items-center gap-2"><Phone size={13} className="text-faint" />{cl.phone}</div>
                  {cl.email && <div className="flex items-center gap-2"><Mail size={13} className="text-faint" />{cl.email}</div>}
                </div>

                <div className="mt-3 border-t border-line-soft pt-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
                    진행 사건 {myCases.length}건
                  </div>
                  <div className="space-y-1.5">
                    {myCases.map((c) => (
                      <Link
                        key={c.id}
                        href={`/cases/${c.id}`}
                        className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-[13px] hover:bg-brand-50"
                      >
                        <span className="flex items-center gap-2">
                          <CaseTypeBadge type={c.type} />
                          <span className="text-muted">{stageLabel[c.stage]}</span>
                        </span>
                        <ArrowRight size={14} className="text-faint" />
                      </Link>
                    ))}
                    {myCases.length === 0 && <div className="text-xs text-faint">등록된 사건 없음</div>}
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-faint">등록일 {formatDate(cl.createdAt)}</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
