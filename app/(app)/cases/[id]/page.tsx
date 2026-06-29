"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Landmark,
  Loader2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, CardHeader, Badge, Button, EmptyState, Stat, Field, Input } from "@/components/ui";
import { CaseUploads } from "@/components/CaseUploads";
import type { Creditor, Asset, AssetCategory, IncomeExpense } from "@/lib/types";

const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`;
const numOf = (s: string) => Number(String(s).replace(/[^0-9]/g, "")) || 0;
const creditorCatLabel: Record<Creditor["category"], string> = {
  bank: "은행", card: "카드", capital: "캐피탈", loan: "대부·저축", private: "개인·사채", public: "공과금", etc: "기타",
};
const assetCats: AssetCategory[] = ["realestate", "vehicle", "deposit", "lease", "insurance", "pension", "security", "receivable", "etc"];
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
      {tab === "채권자" && <CreditorEditor caseId={c.id} />}
      {tab === "재산" && <AssetEditor caseId={c.id} />}
      {tab === "변제계획" && <PlanTab caseId={c.id} />}
      {tab === "일정·서류" && (
        <div className="space-y-4">
        <CaseUploads caseId={c.id} />
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
    <div className="space-y-4">
      <IncomeEditor caseId={caseId} />
      <CourtLookup caseId={caseId} />
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

const selCls = "h-9.5 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100";

function IncomeEditor({ caseId }: { caseId: string }) {
  const store = useStore();
  const c = store.caseById(caseId)!;
  const { firmId, configured } = useAuth();
  const [memberNames, setMemberNames] = useState<string[]>([]);
  useEffect(() => {
    if (!configured || !firmId) return;
    const sb = getSupabase();
    if (!sb) return;
    sb.from("members").select("name").eq("firm_id", firmId).then(({ data }) => {
      if (data) setMemberNames(data.map((m) => m.name).filter(Boolean) as string[]);
    });
  }, [configured, firmId]);
  const assigneeOptions = Array.from(new Set([...(c.assignee ? [c.assignee] : []), ...memberNames]));
  const setIncome = (patch: Partial<IncomeExpense>) => store.updateCase(caseId, { income: { ...c.income, ...patch } });
  const types: { v: IncomeExpense["incomeType"]; l: string }[] = [
    { v: "salary", l: "근로" }, { v: "business", l: "사업" }, { v: "freelance", l: "프리랜서" }, { v: "mixed", l: "혼합" },
  ];
  return (
    <Card>
      <CardHeader title="사건 · 소득 정보 (수정 가능)" desc="값을 바꾸면 변제계획·진단에 즉시 반영됩니다. 자동 저장됩니다." />
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="월 소득(세후, 원)">
          <Input value={c.income.monthlyIncome ? String(c.income.monthlyIncome) : ""} inputMode="numeric" placeholder="0"
            onChange={(e) => setIncome({ monthlyIncome: numOf(e.target.value) })} />
        </Field>
        <Field label="소득 유형">
          <select className={selCls} value={c.income.incomeType} onChange={(e) => setIncome({ incomeType: e.target.value as IncomeExpense["incomeType"] })}>
            {types.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </Field>
        <Field label="부양가족 수(본인 포함 가구원)">
          <Input value={String(c.income.dependents)} inputMode="numeric" onChange={(e) => setIncome({ dependents: numOf(e.target.value) })} />
        </Field>
        <Field label="인정 생계비(원)" hint="미입력 시 기준 중위소득으로 자동 계산">
          <Input value={c.income.livingCost ? String(c.income.livingCost) : ""} inputMode="numeric" placeholder="자동 계산"
            onChange={(e) => setIncome({ livingCost: numOf(e.target.value) || undefined })} />
        </Field>
        <Field label="관할 법원">
          <Input value={c.court} onChange={(e) => store.updateCase(caseId, { court: e.target.value })} />
        </Field>
        <Field label="사건번호">
          <Input value={c.caseNo ?? ""} placeholder="예: 2026개회12345" onChange={(e) => store.updateCase(caseId, { caseNo: e.target.value })} />
        </Field>
        <Field label="담당자">
          {assigneeOptions.length > 0 ? (
            <select className={selCls} value={c.assignee ?? ""} onChange={(e) => store.updateCase(caseId, { assignee: e.target.value })}>
              <option value="">미지정</option>
              {assigneeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          ) : (
            <Input value={c.assignee ?? ""} placeholder="담당 직원 이름" onChange={(e) => store.updateCase(caseId, { assignee: e.target.value })} />
          )}
        </Field>
      </div>
    </Card>
  );
}

interface CourtResult {
  ok: boolean; mock: boolean; caseNo: string; court: string; status: string;
  progress: { date: string; label: string }[];
  upcoming: { date: string; type: string; label: string }[];
  message: string;
}
function CourtLookup({ caseId }: { caseId: string }) {
  const store = useStore();
  const c = store.caseById(caseId)!;
  const [res, setRes] = useState<CourtResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const lookup = async () => {
    if (!c.caseNo) { setErr("사건번호를 먼저 입력하세요."); return; }
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/court/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ caseNo: c.caseNo, court: c.court }) });
      const j = await r.json();
      if (!j.ok) setErr(j.message ?? "조회 실패"); else setRes(j as CourtResult);
    } catch { setErr("조회 중 오류가 발생했습니다."); } finally { setLoading(false); }
  };
  const addEvent = (u: CourtResult["upcoming"][number]) => {
    store.addEvent({ id: uid("ev"), caseId, type: u.type as never, title: u.label, date: u.date, notifyKakao: true, notifyEmail: false });
    setAdded((m) => ({ ...m, [u.date + u.label]: true }));
  };
  return (
    <Card>
      <CardHeader title="법원 사건 조회" desc="대법원 나의사건검색 연동 — 진행상태·기일 자동 확인" action={<Button size="sm" variant="secondary" onClick={lookup} disabled={loading}>{loading ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />} 조회</Button>} />
      <div className="p-5">
        {err && <div className="mb-2 rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{err}</div>}
        {!res ? (
          <p className="text-[13px] text-muted">사건번호({c.caseNo || "미입력"})로 진행상태와 다가오는 기일을 조회합니다.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{res.court}</Badge>
              <span className="text-[13px] font-semibold text-ink">{res.status}</span>
              {res.mock && <Badge tone="warning">목업</Badge>}
            </div>
            <div>
              <div className="mb-1 text-[12px] font-semibold text-faint">진행 내역</div>
              <ul className="space-y-1">
                {res.progress.map((p, i) => (<li key={i} className="flex items-center gap-2 text-[13px] text-ink-soft"><span className="tabular-nums text-faint">{p.date}</span> {p.label}</li>))}
              </ul>
            </div>
            <div>
              <div className="mb-1 text-[12px] font-semibold text-faint">다가오는 기일</div>
              <ul className="space-y-1.5">
                {res.upcoming.map((u, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
                    <div className="text-[13px]"><span className="font-semibold tabular-nums text-ink">{u.date}</span> <span className="text-ink-soft">{u.label}</span></div>
                    <button onClick={() => addEvent(u)} disabled={!!added[u.date + u.label]} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11.5px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50">
                      {added[u.date + u.label] ? <><CheckCircle2 size={11} /> 추가됨</> : <><Plus size={11} /> 일정 추가</>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[11px] text-faint">{res.message}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function CreditorEditor({ caseId }: { caseId: string }) {
  const store = useStore();
  const c = store.caseById(caseId)!;
  const set = (list: Creditor[]) => store.updateCase(caseId, { creditors: list });
  const upd = (id: string, patch: Partial<Creditor>) => set(c.creditors.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const total = c.creditors.reduce((s, x) => s + x.principal + x.interest, 0);
  const add = () => set([...c.creditors, { id: uid("cr"), name: "", category: "card", principal: 0, interest: 0 }]);
  return (
    <Card>
      <CardHeader
        title="채권자 목록"
        desc={`${c.creditors.length}개 · 총 ${won(total)}`}
        action={<Button size="sm" onClick={add}><Plus size={14} /> 채권자 추가</Button>}
      />
      {c.creditors.length === 0 ? (
        <EmptyState title="등록된 채권자가 없습니다" desc="‘채권자 추가’로 직접 입력하세요. 신용정보조회서·부채증명서를 참고하거나, 거래내역 분석 결과를 활용할 수 있습니다." action={<Button variant="secondary" onClick={add}><Plus size={15} /> 채권자 추가</Button>} />
      ) : (
        <div className="space-y-2 p-5">
          <div className="hidden gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-faint sm:grid sm:grid-cols-[1.4fr_.8fr_1fr_1fr_auto]">
            <span>채권자명</span><span>구분</span><span>원금</span><span>이자·연체</span><span></span>
          </div>
          {c.creditors.map((cr) => (
            <div key={cr.id} className="grid grid-cols-1 gap-2 rounded-lg border border-line-soft p-2 sm:grid-cols-[1.4fr_.8fr_1fr_1fr_auto] sm:border-0 sm:p-0">
              <Input value={cr.name} placeholder="채권자명" onChange={(e) => upd(cr.id, { name: e.target.value })} />
              <select className={selCls} value={cr.category} onChange={(e) => upd(cr.id, { category: e.target.value as Creditor["category"] })}>
                {Object.entries(creditorCatLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <Input value={cr.principal ? String(cr.principal) : ""} inputMode="numeric" placeholder="원금" onChange={(e) => upd(cr.id, { principal: numOf(e.target.value) })} />
              <Input value={cr.interest ? String(cr.interest) : ""} inputMode="numeric" placeholder="이자·연체" onChange={(e) => upd(cr.id, { interest: numOf(e.target.value) })} />
              <button onClick={() => set(c.creditors.filter((x) => x.id !== cr.id))} title="삭제" className="flex h-9.5 w-9.5 items-center justify-center rounded-lg text-faint hover:bg-surface-2 hover:text-danger">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <div className="flex justify-end pt-2 text-[13px]"><span className="text-muted">총 채무 합계</span><span className="ml-2 font-bold tabular-nums text-brand-700">{won(total)}</span></div>
        </div>
      )}
    </Card>
  );
}

function AssetEditor({ caseId }: { caseId: string }) {
  const store = useStore();
  const c = store.caseById(caseId)!;
  const set = (list: Asset[]) => store.updateCase(caseId, { assets: list });
  const upd = (id: string, patch: Partial<Asset>) => set(c.assets.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const liq = c.assets.reduce((s, a) => s + Math.max(0, a.value - (a.exemptAmount || 0)), 0);
  const add = () => set([...c.assets, { id: uid("as"), category: "deposit", label: "", value: 0, exemptAmount: 0 }]);
  return (
    <Card>
      <CardHeader
        title="재산 목록"
        desc={`${c.assets.length}개 · 청산가치 ${won(liq)}`}
        action={<Button size="sm" onClick={add}><Plus size={14} /> 재산 추가</Button>}
      />
      {c.assets.length === 0 ? (
        <EmptyState title="등록된 재산이 없습니다" desc="‘재산 추가’로 부동산·자동차·예금·보증금·보험 등을 직접 입력하세요." action={<Button variant="secondary" onClick={add}><Plus size={15} /> 재산 추가</Button>} />
      ) : (
        <div className="space-y-2 p-5">
          <div className="hidden gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-faint sm:grid sm:grid-cols-[.9fr_1.4fr_1fr_1fr_auto]">
            <span>구분</span><span>내용</span><span>평가액</span><span>면제 인정액</span><span></span>
          </div>
          {c.assets.map((a) => (
            <div key={a.id} className="grid grid-cols-1 gap-2 rounded-lg border border-line-soft p-2 sm:grid-cols-[.9fr_1.4fr_1fr_1fr_auto] sm:border-0 sm:p-0">
              <select className={selCls} value={a.category} onChange={(e) => upd(a.id, { category: e.target.value as AssetCategory })}>
                {assetCats.map((k) => <option key={k} value={k}>{assetCatLabel[k]}</option>)}
              </select>
              <Input value={a.label} placeholder="예: 임차보증금(전세)" onChange={(e) => upd(a.id, { label: e.target.value })} />
              <Input value={a.value ? String(a.value) : ""} inputMode="numeric" placeholder="평가액" onChange={(e) => upd(a.id, { value: numOf(e.target.value) })} />
              <Input value={a.exemptAmount ? String(a.exemptAmount) : ""} inputMode="numeric" placeholder="면제 인정액" onChange={(e) => upd(a.id, { exemptAmount: numOf(e.target.value) })} />
              <button onClick={() => set(c.assets.filter((x) => x.id !== a.id))} title="삭제" className="flex h-9.5 w-9.5 items-center justify-center rounded-lg text-faint hover:bg-surface-2 hover:text-danger">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <div className="flex justify-end pt-2 text-[13px]"><span className="text-muted">청산가치 합계</span><span className="ml-2 font-bold tabular-nums text-brand-700">{won(liq)}</span></div>
        </div>
      )}
    </Card>
  );
}
