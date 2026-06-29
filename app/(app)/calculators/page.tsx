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

      <SongdalCalc />
      <LivingCostRef />
    </div>
  );
}

function LivingCostRef() {
  const items = [
    { t: "의료비·요양비", d: "본인·부양가족의 지속적 치료비, 요양·간병비" },
    { t: "장애·중증질환 추가비용", d: "장애인·중증환자 부양에 따른 추가 지출" },
    { t: "양육·교육비", d: "미성년 자녀 보육료·교육비 (일정 범위)" },
    { t: "과다 임차료 일부", d: "주거비가 과다한 경우 일부 인정" },
    { t: "직업 유지 필수비용", d: "업무상 반드시 필요한 비용 등" },
  ];
  return (
    <Card className="mt-4">
      <CardHeader title="추가생계비 인정 기준 (참고)" desc="기준 중위소득 외에 법원이 추가로 인정할 수 있는 생계비 항목입니다." action={<Info size={16} className="text-brand" />} />
      <div className="divide-y divide-line-soft">
        {items.map((it, i) => (
          <div key={i} className="px-5 py-3">
            <div className="text-[13.5px] font-semibold text-ink">{it.t}</div>
            <div className="text-[12.5px] text-muted">{it.d}</div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 text-[11.5px] text-faint">※ 인정 여부·금액은 법원 심사와 개별 사정(소명자료)에 따라 결정됩니다. 관할 법원(예: 서울회생법원) 실무준칙을 확인하세요.</div>
    </Card>
  );
}

function SongdalCalc() {
  const [type, setType] = useState<"rehab" | "bankruptcy">("rehab");
  const [creditors, setCreditors] = useState(10);
  const [unit, setUnit] = useState(5200);
  const [addPersons, setAddPersons] = useState(3);
  const [rounds, setRounds] = useState(10);
  const songdal = (creditors + addPersons) * unit * rounds;
  const stamp = type === "rehab" ? 30000 : 2000; // 회생 인지대 3만 / 파산+면책 각 1천
  const totalPrepay = songdal + stamp;
  const setT = (t: "rehab" | "bankruptcy") => { setType(t); setRounds(t === "rehab" ? 10 : 4); };

  return (
    <Card className="mt-4">
      <CardHeader title="송달료 · 인지대 계산기" desc="법원 예납금(송달료+인지대)을 미리 계산합니다. 단가·횟수·인지대는 관할 법원·시기에 따라 다를 수 있어 조정하세요." action={<Scale size={16} className="text-brand" />} />
      <div className="grid gap-4 p-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["rehab", "bankruptcy"] as const).map((t) => (
              <button key={t} onClick={() => setT(t)} className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${type === t ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"}`}>
                {t === "rehab" ? "개인회생" : "개인파산·면책"}
              </button>
            ))}
          </div>
          <Field label="채권자 수"><Input type="number" value={creditors} onChange={(e) => setCreditors(Math.max(0, Number(e.target.value)))} /></Field>
          <Field label="1회 송달료 단가 (원)" hint="현재 1회 5,200원"><Input type="number" value={unit} onChange={(e) => setUnit(Number(e.target.value))} /></Field>
          <Field label="가산 인원" hint="채무자·법원 등 송달 대상 가산(통상 +3)"><Input type="number" value={addPersons} onChange={(e) => setAddPersons(Math.max(0, Number(e.target.value)))} /></Field>
          <Field label="송달 횟수" hint={type === "rehab" ? "개인회생 통상 10회" : "개인파산 통상 4회"}><Input type="number" value={rounds} onChange={(e) => setRounds(Math.max(1, Number(e.target.value)))} /></Field>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl bg-brand p-5 text-white">
            <div className="text-[13px] text-brand-100">법원 예납 총액 (송달료 + 인지대)</div>
            <div className="mt-1 text-3xl font-bold tabular-nums">{won(totalPrepay)}</div>
          </div>
          <ResultRow label="송달료" value={won(songdal)} sub={`(${creditors} + ${addPersons}) × ${unit.toLocaleString()}원 × ${rounds}회`} />
          <ResultRow label="인지대" value={won(stamp)} sub={type === "rehab" ? "개인회생 정액 30,000원" : "파산 1,000 + 면책 1,000"} />
          <div className="flex items-start gap-2 rounded-lg bg-surface-2 p-3 text-[12.5px] text-ink-soft">
            <Info size={15} className="mt-0.5 shrink-0 text-brand" />
            송달료 단가·횟수와 인지대는 법원·시기에 따라 달라질 수 있습니다. 실제 납부 전 관할 법원 기준을 확인하세요.
          </div>
        </div>
      </div>
    </Card>
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
