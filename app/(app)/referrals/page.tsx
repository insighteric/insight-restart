"use client";

import { useMemo, useState } from "react";
import { LifeBuoy, Plus, Trash2, Gavel, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Button, Badge, Textarea, EmptyState } from "@/components/ui";
import { won, caseTypeLabel, formatDate, referralReasonLabel, referralTargetLabel, referralStatusLabel, referralStatusTone } from "@/lib/format";
import type { Referral, ReferralReason, ReferralTarget, ReferralStatus, Case } from "@/lib/types";

const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`;
const STATUS_ORDER: ReferralStatus[] = ["candidate", "consulting", "applied", "in_progress", "done", "hold"];
const TARGETS: ReferralTarget[] = ["credit_workout", "credit_prework", "fresh_start", "refile", "etc"];
const REASONS: ReferralReason[] = ["rehab_dismissed", "rehab_abolished", "rehab_denied", "bankruptcy_denied", "etc"];

const caseDebt = (c: Case) => c.creditors.reduce((s, cr) => s + cr.principal + cr.interest, 0);

export default function ReferralsPage() {
  const store = useStore();

  const referrals = store.referrals
    .map((r) => ({ ref: r, case: store.caseById(r.caseId) }))
    .filter((x) => x.case) as { ref: Referral; case: Case }[];

  // 기각·폐지(status lost) 사건 중 아직 연계 안 된 것
  const unassigned = store.cases.filter((c) => c.status === "lost" && !store.referralForCase(c.id));
  // 수동 추가용: 연계 안 된 모든 사건
  const addableCases = store.cases.filter((c) => !store.referralForCase(c.id));
  const [pickCase, setPickCase] = useState("");

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const { ref } of referrals) m[ref.status] = (m[ref.status] ?? 0) + 1;
    const open = referrals.filter((r) => r.ref.status !== "done" && r.ref.status !== "hold").length;
    return { total: referrals.length, open, byStatus: m };
  }, [referrals]);

  const createReferral = (c: Case) => {
    const reason: ReferralReason = c.type === "rehab" ? "rehab_dismissed" : "bankruptcy_denied";
    store.addReferral({
      id: uid("rf"), caseId: c.id, reason, target: "credit_workout", status: "candidate",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div>
      <PageHeader
        title="신복·새출발 연계"
        desc="회생 기각·폐지 사건을 신용회복위원회·새출발기금 등으로 연계하고 진행상황·특이사항을 관리합니다."
        action={<Badge tone={counts.open ? "warning" : "muted"}><LifeBuoy size={11} /> 진행 {counts.open}건</Badge>}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <span className="text-[13px] font-medium text-muted">상태:</span>
          {STATUS_ORDER.map((s) => (
            <Badge key={s} tone={(referralStatusTone[s] as "muted") ?? "muted"}>
              {referralStatusLabel[s]} {counts.byStatus[s] ?? 0}
            </Badge>
          ))}
        </div>
      </Card>

      {/* 미배정 기각·폐지 사건 */}
      {unassigned.length > 0 && (
        <Card className="mb-4 border-warning/40">
          <CardHeader
            title={<span className="flex items-center gap-1.5"><Gavel size={15} className="text-warning" /> 기각·폐지 사건 — 연계 미배정 {unassigned.length}건</span>}
            desc="아래 사건을 신복/새출발 대상으로 추가하세요."
          />
          <div className="divide-y divide-line-soft">
            {unassigned.map((c) => {
              const cl = store.clientById(c.clientId);
              return (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-ink">{cl?.name ?? "의뢰인"}</span>
                    <span className="ml-2 text-[12.5px] text-muted">{caseTypeLabel[c.type]}{c.caseNo ? ` · ${c.caseNo}` : ""} · 채무 {won(caseDebt(c))}</span>
                  </div>
                  <Button size="sm" onClick={() => createReferral(c)}><Plus size={13} /> 대상 추가</Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 진행 목록 */}
      {referrals.length === 0 ? (
        <Card>
          <EmptyState
            icon={<LifeBuoy size={30} />}
            title="연계 대상이 없습니다"
            desc="회생이 기각·폐지된 사건을 신복(개인워크아웃)·새출발기금·재신청 등으로 연계해 관리하세요. 사건 상태를 ‘기각·폐지’로 두면 위에 자동으로 모입니다."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {[...referrals]
            .sort((a, b) => STATUS_ORDER.indexOf(a.ref.status) - STATUS_ORDER.indexOf(b.ref.status))
            .map(({ ref, case: c }) => (
              <ReferralCard
                key={ref.id}
                ref0={ref}
                case0={c}
                clientName={store.clientById(c.clientId)?.name ?? "의뢰인"}
                onUpdate={(patch) => store.updateReferral(ref.id, { ...patch, updatedAt: new Date().toISOString() })}
                onRemove={() => { if (confirm("이 연계 대상을 삭제할까요?")) store.removeReferral(ref.id); }}
              />
            ))}
        </div>
      )}

      {/* 수동 추가 */}
      {addableCases.length > 0 && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <span className="text-[13px] font-medium text-muted">다른 사건 직접 추가:</span>
            <select
              value={pickCase}
              onChange={(e) => setPickCase(e.target.value)}
              className="h-9 min-w-[220px] rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">사건 선택…</option>
              {addableCases.map((c) => {
                const cl = store.clientById(c.clientId);
                return <option key={c.id} value={c.id}>{cl?.name ?? "의뢰인"} · {caseTypeLabel[c.type]}{c.caseNo ? ` (${c.caseNo})` : ""}</option>;
              })}
            </select>
            <Button
              size="sm"
              variant="secondary"
              disabled={!pickCase}
              onClick={() => { const c = store.caseById(pickCase); if (c) { createReferral(c); setPickCase(""); } }}
            >
              <Plus size={13} /> 추가
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ReferralCard({
  ref0,
  case0,
  clientName,
  onUpdate,
  onRemove,
}: {
  ref0: Referral;
  case0: Case;
  clientName: string;
  onUpdate: (patch: Partial<Referral>) => void;
  onRemove: () => void;
}) {
  const selCls = "h-8 rounded-lg border border-line bg-surface px-2 text-[13px] outline-none focus:border-brand-300";
  return (
    <Card>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{clientName}</span>
          <span className="text-[12.5px] text-muted">{caseTypeLabel[case0.type]}{case0.caseNo ? ` · ${case0.caseNo}` : ""}</span>
          <Badge tone="muted">{referralReasonLabel[ref0.reason]}</Badge>
          <Badge tone={(referralStatusTone[ref0.status] as "muted") ?? "muted"}>{referralStatusLabel[ref0.status]}</Badge>
          <span className="ml-auto text-[12px] text-faint">채무 {won(caseDebt(case0))} · 갱신 {formatDate(ref0.updatedAt)}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
            사유
            <select className={selCls} value={ref0.reason} onChange={(e) => onUpdate({ reason: e.target.value as ReferralReason })}>
              {REASONS.map((r) => <option key={r} value={r}>{referralReasonLabel[r]}</option>)}
            </select>
          </label>
          <ArrowRight size={14} className="text-faint" />
          <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
            연계대상
            <select className={selCls} value={ref0.target} onChange={(e) => onUpdate({ target: e.target.value as ReferralTarget })}>
              {TARGETS.map((t) => <option key={t} value={t}>{referralTargetLabel[t]}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
            상태
            <select className={selCls} value={ref0.status} onChange={(e) => onUpdate({ status: e.target.value as ReferralStatus })}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{referralStatusLabel[s]}</option>)}
            </select>
          </label>
          <button onClick={onRemove} title="삭제" className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-surface-2 hover:text-danger">
            <Trash2 size={14} />
          </button>
        </div>

        <Textarea
          value={ref0.memo ?? ""}
          onChange={(e) => onUpdate({ memo: e.target.value })}
          rows={2}
          placeholder="특이사항·진행 메모 (예: 신복 상담일, 필요서류, 조정안 등)"
          className="mt-3 text-[13px]"
        />
      </div>
    </Card>
  );
}
