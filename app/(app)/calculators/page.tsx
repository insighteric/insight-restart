"use client";

import { useState } from "react";
import { Calculator, Scale, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Field, Input, Badge } from "@/components/ui";
import { ProgressBar } from "@/components/CaseBits";
import { won, manwon, pct } from "@/lib/format";
import { livingCost, medianIncomeFor } from "@/lib/calc";

export default function CalculatorsPage() {
  const { settings } = useStore();
  const [income, setIncome] = useState(2_900_000);
  const [household, setHousehold] = useState(3);
  const [debt, setDebt] = useState(50_000_000);
  const [liquidation, setLiquidation] = useState(22_500_000);
  const [months, setMonths] = useState(36);

  const lc = livingCost({ monthlyIncome: income, incomeType: "salary", dependents: household }, settings);
  const disposable = Math.max(0, income - lc);
  const byIncome = disposable * months;
  const total = Math.max(byIncome, liquidation);
  const monthly = Math.round(total / months);
  const rate = debt > 0 ? (total / debt) * 100 : 0;
  const median = medianIncomeFor(household, settings);

  return (
    <div>
      <PageHeader title="변제 계산기" desc="가용소득·청산가치·변제율을 즉시 계산합니다. (기준 중위소득 설정값 적용)" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="입력" />
          <div className="space-y-4 p-5">
            <Field label="월 소득 (세후)" hint={won(income)}>
              <Input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} />
            </Field>
            <Field label="가구원수 (본인 포함)" hint={`기준 중위소득 ${won(median)}`}>
              <Input type="number" value={household} onChange={(e) => setHousehold(Math.max(1, Number(e.target.value)))} />
            </Field>
            <Field label="총 채무액" hint={won(debt)}>
              <Input type="number" value={debt} onChange={(e) => setDebt(Number(e.target.value))} />
            </Field>
            <Field label="청산가치" hint={`${won(liquidation)} · 재산 평가액 − 면제재산`}>
              <Input type="number" value={liquidation} onChange={(e) => setLiquidation(Number(e.target.value))} />
            </Field>
            <Field label="변제기간">
              <div className="flex gap-2">
                {[36, 48, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMonths(m)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                      months === m ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"
                    }`}
                  >
                    {m}개월
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="계산 결과" action={<Calculator size={16} className="text-brand" />} />
            <div className="p-5">
              <div className="rounded-xl bg-brand p-5 text-white">
                <div className="text-[13px] text-brand-100">월 변제액 (추정)</div>
                <div className="mt-1 text-3xl font-bold tabular-nums">{won(monthly)}</div>
                <div className="mt-3 flex gap-4 text-[13px] text-brand-100">
                  <span>총 변제 {manwon(total)}</span>
                  <span>변제율 {pct(rate)}</span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <ResultRow label="인정 생계비" value={won(lc)} sub={`기준 중위소득의 ${settings.livingCostRatio * 100}%`} />
                <ResultRow label="월 가용소득" value={won(disposable)} tone={disposable > 0 ? "success" : "danger"} />
                <ResultRow label="가용소득 기준 총액" value={won(byIncome)} sub={`${disposable.toLocaleString()} × ${months}개월`} />
                <ResultRow label="청산가치 보장선" value={won(liquidation)} />
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="text-muted">변제율</span>
                  <span className="font-bold tabular-nums">{pct(rate)}</span>
                </div>
                <ProgressBar value={rate} tone={rate >= 100 ? "success" : "brand"} />
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg bg-surface-2 p-3 text-[12.5px] text-ink-soft">
                <Info size={15} className="mt-0.5 shrink-0 text-brand" />
                {liquidation > byIncome
                  ? "청산가치가 가용소득 총액보다 커서 월 변제액이 청산가치 기준으로 상향됩니다. (청산가치 보장 원칙)"
                  : disposable <= 0
                    ? "가용소득이 0 이하입니다. 소득 증대 또는 개인파산 검토가 필요할 수 있습니다."
                    : "가용소득 기준으로 변제계획이 산정됩니다."}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-[13px] text-muted">
              <Scale size={15} className="text-faint" />
              기준 중위소득·생계비 비율은 <a href="/settings" className="font-semibold text-brand hover:underline">설정</a>에서 매년 변경할 수 있습니다.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ResultRow({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "success" | "danger" }) {
  return (
    <div className="flex items-center justify-between border-b border-line-soft pb-2.5">
      <div>
        <div className="text-sm text-ink-soft">{label}</div>
        {sub && <div className="text-[11px] text-faint">{sub}</div>}
      </div>
      <div className={`text-sm font-bold tabular-nums ${tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}
