"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, ArrowRight, ShieldCheck, Scale, Landmark } from "lucide-react";
import { Card, Button, Badge } from "@/components/ui";
import { DEFAULT_SETTINGS } from "@/lib/calc";
import { suggestPlan, assessSuitability, disposableIncome, livingCost } from "@/lib/calc";
import { won, manwon, pct } from "@/lib/format";
import type { IncomeExpense, Asset, Creditor } from "@/lib/types";

const numOf = (s: string) => Number(String(s).replace(/[^0-9]/g, "")) || 0;

export default function SelfCheckPage() {
  const [monthly, setMonthly] = useState("");
  const [household, setHousehold] = useState("1");
  const [debt, setDebt] = useState("");
  const [asset, setAsset] = useState("");
  const [result, setResult] = useState<null | {
    recommend: string; reasons: string[]; monthly: number; rate: number; disposable: number; liquidation: number; debt: number; living: number;
  }>(null);

  const run = () => {
    const s = DEFAULT_SETTINGS;
    const income: IncomeExpense = { monthlyIncome: numOf(monthly), incomeType: "salary", dependents: Math.max(1, numOf(household)) };
    const creditors: Creditor[] = [{ id: "c", name: "합계", category: "etc", principal: numOf(debt), interest: 0 }];
    const assets: Asset[] = numOf(asset) > 0 ? [{ id: "a", category: "etc", label: "보유재산", value: numOf(asset), exemptAmount: 0 }] : [];
    const plan = suggestPlan(income, assets, creditors, s, 36);
    const suit = assessSuitability(income, assets, creditors, s);
    setResult({
      recommend: suit.recommend, reasons: suit.reasons,
      monthly: plan.monthly, rate: plan.repaymentRate, disposable: plan.disposable,
      liquidation: plan.liquidation, debt: plan.debt, living: livingCost(income, s),
    });
  };

  const recLabel = result?.recommend === "rehab" ? "개인회생" : result?.recommend === "bankruptcy" ? "개인파산" : "추가 검토 필요";
  const canRun = numOf(monthly) >= 0 && numOf(debt) > 0;

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Insight Restart" className="h-12 w-12 rounded-2xl" />
          <div>
            <div className="text-xl font-extrabold tracking-tight text-ink">개인회생·파산 무료 자가진단</div>
            <div className="text-[12.5px] text-muted">소득·채무를 입력하면 적합 절차와 예상 변제금을 알려드립니다 (참고용)</div>
          </div>
        </div>

        <Card>
          <div className="space-y-3 p-5">
            <FieldRow label="월 소득 (세후, 원)">
              <input value={monthly} onChange={(e) => setMonthly(e.target.value)} inputMode="numeric" placeholder="예: 2500000"
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
            </FieldRow>
            <FieldRow label="부양가족 수 (본인 포함 가구원)">
              <input value={household} onChange={(e) => setHousehold(e.target.value)} inputMode="numeric"
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
            </FieldRow>
            <FieldRow label="총 채무 (원)">
              <input value={debt} onChange={(e) => setDebt(e.target.value)} inputMode="numeric" placeholder="예: 80000000"
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
            </FieldRow>
            <FieldRow label="보유 재산 (대략, 원)">
              <input value={asset} onChange={(e) => setAsset(e.target.value)} inputMode="numeric" placeholder="예: 5000000 (없으면 0)"
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
            </FieldRow>
            <Button className="w-full" size="lg" onClick={run} disabled={!canRun}>
              <Sparkles size={16} /> 무료 진단하기
            </Button>
          </div>
        </Card>

        {result && (
          <Card className="mt-4">
            <div className="border-b border-line-soft px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted">진단 결과 — 추천 절차</span>
                <Badge tone={result.recommend === "rehab" ? "brand" : result.recommend === "bankruptcy" ? "info" : "muted"}>
                  {result.recommend === "rehab" ? <Scale size={12} /> : result.recommend === "bankruptcy" ? <Landmark size={12} /> : <ShieldCheck size={12} />} {recLabel}
                </Badge>
              </div>
            </div>
            <div className="space-y-4 p-5">
              {result.recommend !== "bankruptcy" && (
                <div className="rounded-xl bg-brand-50 px-4 py-3.5">
                  <div className="text-[13px] text-brand-700">예상 월 변제액 (개인회생 36개월 기준)</div>
                  <div className="text-3xl font-extrabold tabular-nums text-brand-ink">{won(result.monthly)}</div>
                  <div className="mt-1 text-[12.5px] text-muted">예상 변제율 {pct(result.rate)} · 월 가용소득 {manwon(result.disposable)}</div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <Cell label="인정 생계비" value={manwon(result.living)} />
                <Cell label="청산가치" value={manwon(result.liquidation)} />
                <Cell label="총 채무" value={manwon(result.debt)} />
              </div>
              <div>
                <div className="mb-1.5 text-[12.5px] font-semibold text-ink-soft">진단 근거</div>
                <ul className="space-y-1.5 text-[13px] text-ink-soft">
                  {result.reasons.map((r, i) => (
                    <li key={i} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-300" /> {r}</li>
                  ))}
                </ul>
              </div>
              <p className="rounded-lg bg-surface-2 p-3 text-[11.5px] leading-relaxed text-muted">
                ※ 본 결과는 입력값 기반 <b>참고용 자동 추정</b>이며, 실제 인가 여부·변제액은 법원 심사와 개별 사정에 따라 달라집니다. 정확한 진단은 전문가 상담이 필요합니다.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/login" className="flex-1">
                  <Button className="w-full" size="lg"><ArrowRight size={16} /> 전문가 상담·진행 신청</Button>
                </Link>
                <Button variant="secondary" onClick={() => setResult(null)}><RefreshCw size={15} /> 다시 진단</Button>
              </div>
            </div>
          </Card>
        )}

        <p className="mt-5 text-center text-[12px] text-faint">Insight Restart · 개인회생·파산 AI 실무 플랫폼</p>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12.5px] font-medium text-ink-soft">{label}</label>
      {children}
    </div>
  );
}
function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 py-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-[14px] font-bold tabular-nums text-ink">{value}</div>
    </div>
  );
}
