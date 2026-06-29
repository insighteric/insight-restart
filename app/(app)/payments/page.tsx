"use client";

import { useMemo, useState } from "react";
import { Wallet, Plus, Check, AlertTriangle, Lock, Trash2, ChevronDown, CalendarClock } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Button, Badge, Stat, Field, Input, EmptyState, Donut } from "@/components/ui";
import { won, formatDate } from "@/lib/format";
import { feeStatus } from "@/lib/fees";
import type { FeePlan, FeeInstallment } from "@/lib/types";

const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`;
const addMonthsISO = (base: string, m: number) => {
  const d = new Date(base);
  d.setMonth(d.getMonth() + m);
  return d.toISOString().slice(0, 10);
};

export default function PaymentsPage() {
  const store = useStore();
  const { can } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // 분납계획 ↔ 사건/의뢰인 조인 (존재하는 사건만)
  const rows = useMemo(() => {
    return store.feePlans
      .map((plan) => {
        const c = store.caseById(plan.caseId);
        const client = c ? store.clientById(c.clientId) : undefined;
        return c ? { plan, case: c, client, status: feeStatus(plan)! } : null;
      })
      .filter(Boolean) as { plan: FeePlan; case: NonNullable<ReturnType<typeof store.caseById>>; client: ReturnType<typeof store.clientById>; status: NonNullable<ReturnType<typeof feeStatus>> }[];
  }, [store]);

  const totals = useMemo(() => {
    const unpaid = rows.reduce((s, r) => s + r.status.unpaid, 0);
    const overdue = rows.reduce((s, r) => s + r.status.overdueAmount, 0);
    const overdueCases = rows.filter((r) => r.status.isOverdue).length;
    const paid = rows.reduce((s, r) => s + r.status.paid, 0);
    return { unpaid, overdue, overdueCases, paid };
  }, [rows]);

  if (!can("payments")) {
    return (
      <div>
        <PageHeader title="분납관리" desc="수임료 분할납부·미납 관리" />
        <Card>
          <EmptyState
            icon={<Lock size={30} />}
            title="접근 권한이 없습니다"
            desc="수임료·미납 정보는 ‘분납관리’ 권한이 있는 계정만 열람할 수 있습니다. 대표(관리자)에게 권한을 요청하세요."
          />
        </Card>
      </div>
    );
  }

  const casesWithoutPlan = store.cases.filter((c) => !store.feePlanForCase(c.id));

  return (
    <div>
      <PageHeader
        title="분납관리"
        desc="수임료 분할납부·미납 현황 (관리자 전용)"
        action={
          <Badge tone="muted"><Lock size={11} /> 관리자만 열람</Badge>
        }
      />

      {(() => {
        const billed = totals.paid + totals.unpaid;
        const rate = billed > 0 ? Math.round((totals.paid / billed) * 100) : 0;
        return (
          <Card className="mb-4">
            <div className="flex flex-wrap items-center gap-5 p-5">
              <Donut value={rate} tone={rate >= 100 ? "success" : totals.overdue ? "danger" : "brand"}
                center={<><span className="text-[18px] font-extrabold tabular-nums text-ink">{rate}%</span><span className="text-[10px] text-muted">납입률</span></>} />
              <div>
                <div className="text-[14px] font-semibold text-ink">수임료 납입 현황</div>
                <div className="mt-1 text-[13px] text-muted">납입 <b className="tabular-nums text-success">{won(totals.paid)}</b> · 미납 <b className={`tabular-nums ${totals.unpaid ? "text-danger" : "text-ink"}`}>{won(totals.unpaid)}</b></div>
                <div className="text-[12px] text-faint">총 청구 {won(billed)} · 연체 {won(totals.overdue)} ({totals.overdueCases}건)</div>
              </div>
            </div>
          </Card>
        );
      })()}

      <Card className="mb-4">
        <div className="grid grid-cols-2 divide-x divide-y divide-line-soft sm:grid-cols-4 sm:divide-y-0">
          <Stat label="미납 합계" value={won(totals.unpaid)} tone={totals.unpaid ? "danger" : "success"} sub={`분납 ${rows.length}건`} />
          <Stat label="연체 금액" value={won(totals.overdue)} tone={totals.overdue ? "danger" : undefined} sub={`연체 ${totals.overdueCases}건`} />
          <Stat label="납입 합계" value={won(totals.paid)} tone="success" />
          <Stat label="분납계획" value={`${rows.length}건`} sub={`미작성 ${casesWithoutPlan.length}건`} />
        </div>
      </Card>

      <div className="mb-4 flex justify-end">
        <Button variant={creating ? "secondary" : "primary"} onClick={() => setCreating((v) => !v)}>
          <Plus size={15} /> 분납계획 만들기
        </Button>
      </div>

      {creating && (
        <CreatePlanForm
          cases={casesWithoutPlan.map((c) => ({ id: c.id, label: `${store.clientById(c.clientId)?.name ?? "의뢰인"} · ${c.type === "rehab" ? "개인회생" : "개인파산"}${c.caseNo ? ` (${c.caseNo})` : ""}` }))}
          onCreate={(plan) => {
            store.addFeePlan(plan);
            setCreating(false);
            setOpen(plan.id);
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {rows.length === 0 && !creating ? (
        <Card>
          <EmptyState
            icon={<Wallet size={30} />}
            title="등록된 분납계획이 없습니다"
            desc="‘분납계획 만들기’로 사건별 수임료 분할납부를 등록하세요. 미납·연체가 자동 계산됩니다."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows
            .sort((a, b) => Number(b.status.isOverdue) - Number(a.status.isOverdue))
            .map(({ plan, case: c, client, status }) => {
              const expanded = open === plan.id;
              return (
                <Card key={plan.id}>
                  <button
                    onClick={() => setOpen(expanded ? null : plan.id)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{client?.name ?? "의뢰인"}</span>
                        <span className="text-[12px] text-muted">{c.type === "rehab" ? "개인회생" : "개인파산"}{c.caseNo ? ` · ${c.caseNo}` : ""}</span>
                        {status.isComplete ? (
                          <Badge tone="success"><Check size={11} /> 완납</Badge>
                        ) : status.isOverdue ? (
                          <Badge tone="danger"><AlertTriangle size={11} /> 연체 {won(status.overdueAmount)}</Badge>
                        ) : (
                          <Badge tone="info">정상</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-[12.5px] text-muted">
                        총 {won(status.total)} · 납입 {won(status.paid)} · <span className={status.unpaid ? "font-semibold text-danger" : ""}>미납 {won(status.unpaid)}</span>
                        {status.nextDue && !status.isComplete && (
                          <span className="ml-1 text-faint">· 다음 {formatDate(status.nextDue.dueDate)} {won(status.nextDue.amount)}</span>
                        )}
                      </div>
                    </div>
                    <ChevronDown size={18} className={`shrink-0 text-faint transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>

                  {expanded && (
                    <PlanDetail
                      plan={plan}
                      onPay={(instId, pay) => {
                        store.updateFeePlan(plan.id, {
                          installments: plan.installments.map((i) =>
                            i.id === instId ? { ...i, paidAmount: pay ? i.amount : 0, paidAt: pay ? todayISO() : undefined } : i,
                          ),
                        });
                      }}
                      onAddInstallment={() => {
                        const last = plan.installments[plan.installments.length - 1];
                        const inst: FeeInstallment = {
                          id: uid("fi"),
                          dueDate: last ? addMonthsISO(last.dueDate, 1) : todayISO(),
                          amount: last?.amount ?? 0,
                          paidAmount: 0,
                        };
                        store.updateFeePlan(plan.id, { installments: [...plan.installments, inst] });
                      }}
                      onRemoveInstallment={(instId) =>
                        store.updateFeePlan(plan.id, { installments: plan.installments.filter((i) => i.id !== instId) })
                      }
                      onRemovePlan={() => {
                        if (confirm("이 분납계획을 삭제할까요?")) store.removeFeePlan(plan.id);
                      }}
                    />
                  )}
                </Card>
              );
            })}
        </div>
      )}

      <p className="mt-4 text-[11px] text-faint">※ 분납·미납 정보는 사무소 대표(owner) 계정에서만 표시됩니다. 사건기록부에는 미납 여부만 표시됩니다.</p>
    </div>
  );
}

function PlanDetail({
  plan,
  onPay,
  onAddInstallment,
  onRemoveInstallment,
  onRemovePlan,
}: {
  plan: FeePlan;
  onPay: (instId: string, pay: boolean) => void;
  onAddInstallment: () => void;
  onRemoveInstallment: (instId: string) => void;
  onRemovePlan: () => void;
}) {
  const today = todayISO();
  return (
    <div className="border-t border-line-soft p-5">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line-soft text-left text-[11px] uppercase tracking-wide text-faint">
              <th className="py-2 pr-2 font-semibold">회차</th>
              <th className="py-2 pr-2 font-semibold">약정일</th>
              <th className="py-2 pr-2 text-right font-semibold">금액</th>
              <th className="py-2 pr-2 font-semibold">상태</th>
              <th className="py-2 text-right font-semibold">처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {plan.installments.map((i, idx) => {
              const paid = (i.paidAmount || 0) >= i.amount && i.amount > 0;
              const overdue = !paid && i.dueDate <= today;
              return (
                <tr key={i.id}>
                  <td className="py-2 pr-2 text-muted">{idx + 1}회</td>
                  <td className="py-2 pr-2 text-muted">{formatDate(i.dueDate)}</td>
                  <td className="py-2 pr-2 text-right font-semibold tnum">{won(i.amount)}</td>
                  <td className="py-2 pr-2">
                    {paid ? (
                      <Badge tone="success"><Check size={11} /> 완납 {i.paidAt ? `(${formatDate(i.paidAt)})` : ""}</Badge>
                    ) : overdue ? (
                      <Badge tone="danger"><AlertTriangle size={11} /> 연체</Badge>
                    ) : (
                      <Badge tone="muted">예정</Badge>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      {paid ? (
                        <Button size="sm" variant="ghost" onClick={() => onPay(i.id, false)}>납부취소</Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => onPay(i.id, true)}><Check size={13} /> 완납처리</Button>
                      )}
                      <button onClick={() => onRemoveInstallment(i.id)} title="회차 삭제" className="flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-surface-2 hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Button size="sm" variant="secondary" onClick={onAddInstallment}><CalendarClock size={13} /> 회차 추가</Button>
        <button onClick={onRemovePlan} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-danger hover:underline">
          <Trash2 size={14} /> 분납계획 삭제
        </button>
      </div>
    </div>
  );
}

function CreatePlanForm({
  cases,
  onCreate,
  onCancel,
}: {
  cases: { id: string; label: string }[];
  onCreate: (p: FeePlan) => void;
  onCancel: () => void;
}) {
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  const [total, setTotal] = useState("1500000");
  const [count, setCount] = useState("3");
  const [start, setStart] = useState(todayISO());

  const submit = () => {
    const totalFee = Number(total.replace(/[^0-9]/g, "")) || 0;
    const n = Math.max(1, Number(count) || 1);
    if (!caseId || totalFee <= 0) return;
    const per = Math.floor(totalFee / n);
    const installments: FeeInstallment[] = Array.from({ length: n }, (_, i) => ({
      id: uid("fi"),
      dueDate: addMonthsISO(start, i),
      amount: i === n - 1 ? totalFee - per * (n - 1) : per, // 마지막 회차에 잔액
      paidAmount: 0,
    }));
    onCreate({ id: uid("fp"), caseId, totalFee, installments, createdAt: new Date().toISOString() });
  };

  if (!cases.length) {
    return (
      <Card className="mb-4">
        <div className="p-5 text-[13px] text-muted">분납계획을 추가할 수 있는 사건이 없습니다. (모든 사건에 이미 계획이 있거나, 사건이 없습니다)</div>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader title="분납계획 만들기" desc="총 수임료를 회차로 나눠 자동 생성합니다." />
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        <Field label="사건(의뢰인)">
          <select value={caseId} onChange={(e) => setCaseId(e.target.value)} className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100">
            {cases.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="총 수임료(원)">
          <Input value={total} onChange={(e) => setTotal(e.target.value)} inputMode="numeric" placeholder="1500000" />
        </Field>
        <Field label="분납 회차 수">
          <Input value={count} onChange={(e) => setCount(e.target.value)} inputMode="numeric" placeholder="3" />
        </Field>
        <Field label="1회차 약정일(이후 매월)">
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3">
        <Button variant="ghost" onClick={onCancel}>취소</Button>
        <Button onClick={submit}><Plus size={15} /> 생성</Button>
      </div>
    </Card>
  );
}
