"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Sparkles,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, Badge, Button, EmptyState, Stat } from "@/components/ui";
import { CaseTypeBadge, CaseStatusBadge, StageTimeline, ProgressBar } from "@/components/CaseBits";
import {
  won,
  manwon,
  pct,
  formatDate,
  stageLabel,
  stagesFor,
  assetCatLabel,
  ddayLabel,
  eventTypeLabel,
} from "@/lib/format";
import {
  totalDebt,
  liquidationValue,
  disposableIncome,
  livingCost,
  suggestPlan,
  assessSuitability,
} from "@/lib/calc";
import type { Stage, CaseType } from "@/lib/types";

const TABS = ["개요", "채권자", "재산", "변제계획", "일정·서류"] as const;
type Tab = (typeof TABS)[number];

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useStore();
  const c = store.caseById(params.id);
  const [tab, setTab] = useState<Tab>("개요");

  if (!store.ready) return <div className="h-40 skeleton rounded-xl" />;
  if (!c)
    return (
      <Card>
        <EmptyState title="사건을 찾을 수 없습니다" action={<Link href="/cases"><Button variant="secondary">사건 목록</Button></Link>} />
      </Card>
    );

  const cl = store.clientById(c.clientId);
  const events = store.eventsForCase(c.id);
  const docs = store.documentsForCase(c.id);
  const corrections = store.correctionsForCase(c.id);

  return (
    <div>
      <Link href="/cases" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={15} /> 사건 목록
      </Link>

      {/* Header */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-xl font-bold text-brand-700">
              {cl?.name?.[0] ?? "?"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-ink">{cl?.name}</h1>
                <CaseTypeBadge type={c.type} />
                <CaseStatusBadge status={c.status} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                <span>{c.court}{c.caseNo ? ` · ${c.caseNo}` : " · 미접수"}</span>
                {cl?.phone && <span className="inline-flex items-center gap-1"><Phone size={13} />{cl.phone}</span>}
                {cl?.job && <span className="inline-flex items-center gap-1"><Briefcase size={13} />{cl.job}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/corrections">
              <Button variant="secondary">
                <Sparkles size={15} /> 보정 처리
              </Button>
            </Link>
            <StageSelect caseId={c.id} type={c.type} stage={c.stage} />
          </div>
        </div>
        <div className="border-t border-line-soft px-5 py-4">
          <StageTimeline c={c} />
        </div>
      </Card>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t ? "text-brand-700" : "text-muted hover:text-ink"
            }`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />}
          </button>
        ))}
      </div>

      {tab === "개요" && <Overview caseId={c.id} />}
      {tab === "채권자" && (
        <Card>
          <CardHeader title="채권자 목록" desc={`총 ${c.creditors.length}개 채권자 · ${won(totalDebt(c.creditors))}`} />
          {c.creditors.length === 0 ? (
            <EmptyState title="등록된 채권자가 없습니다" desc="신용정보 조회서를 바탕으로 채권자를 추가하세요." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-soft text-left text-[11px] uppercase tracking-wide text-faint">
                  <th className="px-5 py-2.5 font-semibold">채권자</th>
                  <th className="px-3 py-2.5 text-right font-semibold">원금</th>
                  <th className="px-3 py-2.5 text-right font-semibold">이자·연체</th>
                  <th className="px-5 py-2.5 text-right font-semibold">합계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {c.creditors.map((cr) => (
                  <tr key={cr.id} className="hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{cr.name}</span>
                        {cr.isDisputed && <Badge tone="warning">다툼</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{won(cr.principal)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted">{won(cr.interest)}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink">{won(cr.principal + cr.interest)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-surface-2">
                  <td className="px-5 py-3 font-semibold text-ink">합계</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{won(c.creditors.reduce((s, x) => s + x.principal, 0))}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{won(c.creditors.reduce((s, x) => s + x.interest, 0))}</td>
                  <td className="px-5 py-3 text-right font-bold tabular-nums text-brand-700">{won(totalDebt(c.creditors))}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </Card>
      )}
      {tab === "재산" && (
        <Card>
          <CardHeader title="재산 목록" desc={`청산가치 ${won(liquidationValue(c.assets))}`} />
          {c.assets.length === 0 ? (
            <EmptyState title="등록된 재산이 없습니다" />
          ) : (
            <div className="divide-y divide-line-soft">
              {c.assets.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone="muted">{assetCatLabel[a.category]}</Badge>
                      <span className="text-sm font-medium text-ink">{a.label}</span>
                    </div>
                    {a.exemptAmount ? (
                      <div className="mt-1 text-xs text-success">면제 인정 {won(a.exemptAmount)}</div>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums text-ink">{won(a.value)}</div>
                    <div className="text-xs text-muted">청산 {won(Math.max(0, a.value - (a.exemptAmount || 0)))}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      {tab === "변제계획" && <PlanTab caseId={c.id} />}
      {tab === "일정·서류" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="일정·기한" action={<Link href="/schedule" className="text-[13px] font-semibold text-brand hover:underline">관리</Link>} />
            {events.length === 0 ? (
              <EmptyState title="등록된 일정이 없습니다" />
            ) : (
              <ul className="divide-y divide-line-soft">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-sm font-medium text-ink">{e.title}</div>
                      <div className="text-xs text-muted">{formatDate(e.date)} · {eventTypeLabel[e.type]}</div>
                    </div>
                    <Badge tone="warning">{ddayLabel(e.date)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="서류" action={<Link href="/documents" className="text-[13px] font-semibold text-brand hover:underline">작성</Link>} />
            {docs.length === 0 ? (
              <EmptyState title="작성된 서류가 없습니다" />
            ) : (
              <ul className="divide-y divide-line-soft">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-medium text-ink">{d.title}</span>
                    <Badge tone={d.status === "final" ? "success" : d.status === "review" ? "warning" : "muted"}>
                      {d.status === "final" ? "완료" : d.status === "review" ? "검토" : "초안"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            {corrections.length > 0 && (
              <div className="border-t border-line-soft px-5 py-3">
                <Link href="/corrections" className="flex items-center gap-2 text-[13px] font-semibold text-brand hover:underline">
                  <Sparkles size={14} /> 진행 중 보정 {corrections.length}건 처리하기
                </Link>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function StageSelect({ caseId, type, stage }: { caseId: string; type: CaseType; stage: Stage }) {
  const { updateCase } = useStore();
  const stages = stagesFor(type);
  return (
    <select
      value={stage}
      onChange={(e) => updateCase(caseId, { stage: e.target.value as Stage })}
      className="h-9.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink-soft outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
    >
      {stages.map((s) => (
        <option key={s} value={s}>
          단계: {stageLabel[s]}
        </option>
      ))}
    </select>
  );
}

function Overview({ caseId }: { caseId: string }) {
  const store = useStore();
  const c = store.caseById(caseId)!;
  const s = store.settings;

  const debt = totalDebt(c.creditors);
  const liq = liquidationValue(c.assets);
  const disp = disposableIncome(c.income, s);
  const lc = livingCost(c.income, s);
  const plan = useMemo(() => suggestPlan(c.income, c.assets, c.creditors, s, 36), [c, s]);
  const suit = useMemo(() => assessSuitability(c.income, c.assets, c.creditors, s), [c, s]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <div className="grid grid-cols-2 divide-x divide-line-soft sm:grid-cols-4">
            <Stat label="총 채무" value={manwon(debt)} />
            <Stat label="청산가치" value={manwon(liq)} />
            <Stat label="월 가용소득" value={manwon(disp)} tone={disp > 0 ? "success" : "danger"} />
            <Stat label="예상 변제율" value={pct(plan.repaymentRate)} />
          </div>
        </Card>

        <Card>
          <CardHeader title="변제계획 자동 추정" desc="36개월 기준 · 청산가치 보장 원칙 반영" />
          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between rounded-lg bg-brand-50 px-4 py-3">
              <div>
                <div className="text-[13px] text-brand-700">월 변제액(추정)</div>
                <div className="text-2xl font-bold tabular-nums text-brand-ink">{won(plan.monthly)}</div>
              </div>
              <div className="text-right text-[13px] text-muted">
                <div>총 변제액 {manwon(plan.total)}</div>
                <div>변제율 {pct(plan.repaymentRate)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              {plan.liquidationGuaranteed ? (
                <Badge tone="success"><CheckCircle2 size={12} /> 청산가치 보장 충족</Badge>
              ) : (
                <Badge tone="danger">청산가치 미달</Badge>
              )}
              <span className="text-muted">{plan.note}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[13px]">
              <div className="rounded-lg bg-surface-2 py-2.5">
                <div className="text-xs text-muted">월 소득</div>
                <div className="font-semibold tabular-nums">{manwon(c.income.monthlyIncome)}</div>
              </div>
              <div className="rounded-lg bg-surface-2 py-2.5">
                <div className="text-xs text-muted">인정 생계비</div>
                <div className="font-semibold tabular-nums">{manwon(lc)}</div>
              </div>
              <div className="rounded-lg bg-surface-2 py-2.5">
                <div className="text-xs text-muted">가용소득</div>
                <div className="font-semibold tabular-nums text-brand-700">{manwon(disp)}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="AI 절차 진단" desc="참고용 적합성 판단" />
          <div className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Badge tone={suit.recommend === "rehab" ? "brand" : suit.recommend === "bankruptcy" ? "info" : "muted"}>
                추천: {suit.recommend === "rehab" ? "개인회생" : suit.recommend === "bankruptcy" ? "개인파산" : "추가 검토"}
              </Badge>
            </div>
            <ul className="space-y-2 text-[13px] text-ink-soft">
              {suit.reasons.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-300" />
                  {r}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-faint">※ 실제 판단은 담당자의 최종 검토가 필요합니다.</p>
          </div>
        </Card>

        {cl_memo(store, c.clientId)}
      </div>
    </div>
  );
}

function cl_memo(store: ReturnType<typeof useStore>, clientId: string) {
  const cl = store.clientById(clientId);
  if (!cl) return null;
  return (
    <Card>
      <CardHeader title="의뢰인 정보" />
      <div className="space-y-2.5 p-5 text-[13px]">
        {cl.email && <Row icon={<Mail size={14} />} text={cl.email} />}
        {cl.address && <Row icon={<MapPin size={14} />} text={cl.address} />}
        {cl.rrnMasked && <Row icon={<Briefcase size={14} />} text={`주민번호 ${cl.rrnMasked}`} />}
        {cl.memo && <p className="mt-1 rounded-lg bg-surface-2 p-3 text-muted">{cl.memo}</p>}
      </div>
    </Card>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-ink-soft">
      <span className="text-faint">{icon}</span>
      {text}
    </div>
  );
}

function PlanTab({ caseId }: { caseId: string }) {
  const store = useStore();
  const c = store.caseById(caseId)!;
  const s = store.settings;
  const [months, setMonths] = useState(c.plan?.totalMonths ?? 36);
  const plan = suggestPlan(c.income, c.assets, c.creditors, s, months);

  return (
    <Card>
      <CardHeader title="변제계획 시뮬레이션" desc="변제기간을 조정하며 월 변제액과 변제율을 확인하세요." />
      <div className="p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="text-sm font-medium text-ink-soft">변제기간</span>
          <div className="flex gap-1.5">
            {[36, 48, 60].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  months === m ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"
                }`}
              >
                {m}개월
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <PlanCell label="월 변제액" value={won(plan.monthly)} primary />
          <PlanCell label="총 변제액" value={won(plan.total)} />
          <PlanCell label="변제율" value={pct(plan.repaymentRate)} />
        </div>

        <div className="mt-5 space-y-3">
          <PlanRow label="월 가용소득" value={won(plan.disposable)} />
          <PlanRow label="청산가치(최소 변제 보장선)" value={won(plan.liquidation)} />
          <PlanRow label="총 채무" value={won(plan.debt)} />
          <div>
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="text-muted">변제율</span>
              <span className="font-semibold tabular-nums">{pct(plan.repaymentRate)}</span>
            </div>
            <ProgressBar value={plan.repaymentRate} tone={plan.repaymentRate >= 100 ? "success" : "brand"} />
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-line bg-surface-2 p-4 text-[13px] text-ink-soft">
          {plan.note}
        </div>
      </div>
    </Card>
  );
}

function PlanCell({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-3.5 ${primary ? "bg-brand text-white" : "bg-surface-2"}`}>
      <div className={`text-[13px] ${primary ? "text-brand-100" : "text-muted"}`}>{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line-soft pb-2.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}
