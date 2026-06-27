import type { Asset, Creditor, IncomeExpense, Settings } from "./types";

// 기준 중위소득(월) 기본값 — 2025년 고시 기준. 매년 변경되므로 설정에서 수정 가능.
export const DEFAULT_MEDIAN_INCOME: Record<number, number> = {
  1: 2392013,
  2: 3932658,
  3: 5025353,
  4: 6097773,
  5: 7108192,
  6: 8064805,
  7: 8988428,
};

export const DEFAULT_SETTINGS: Settings = {
  firmName: "Insight Restart",
  medianIncomeByHousehold: DEFAULT_MEDIAN_INCOME,
  livingCostRatio: 0.6, // 기준 중위소득의 60%
  baseYear: 2025,
};

export function medianIncomeFor(household: number, s: Settings): number {
  const table = s.medianIncomeByHousehold;
  const keys = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  const max = keys[keys.length - 1];
  if (household <= 1) return table[1];
  if (household >= max) {
    // 초과 가구원: 6인↔7인 증가분을 1인당 가산
    const last = table[max];
    const prev = table[max - 1] ?? table[max];
    return last + (last - prev) * (household - max);
  }
  return table[household] ?? table[1];
}

// 인정 생계비(월). 가구원수 = 부양가족 포함 본인까지.
export function livingCost(income: IncomeExpense, s: Settings): number {
  if (income.livingCost && income.livingCost > 0) return income.livingCost;
  const household = Math.max(1, income.dependents || 1);
  return Math.round(medianIncomeFor(household, s) * s.livingCostRatio);
}

// 가용소득(월) = 월소득 − 인정 생계비
export function disposableIncome(income: IncomeExpense, s: Settings): number {
  return Math.max(0, (income.monthlyIncome || 0) - livingCost(income, s));
}

// 청산가치 = Σ(재산 평가액 − 면제 인정액)
export function liquidationValue(assets: Asset[]): number {
  return assets.reduce(
    (sum, a) => sum + Math.max(0, (a.value || 0) - (a.exemptAmount || 0)),
    0,
  );
}

export function totalDebt(creditors: Creditor[]): number {
  return creditors.reduce((s, c) => s + (c.principal || 0) + (c.interest || 0), 0);
}

export interface PlanResult {
  months: number;
  monthly: number;
  total: number; // 총변제액
  disposable: number; // 월 가용소득
  liquidation: number; // 청산가치
  debt: number; // 총채무
  repaymentRate: number; // 변제율(%)
  liquidationGuaranteed: boolean; // 청산가치 보장 충족 여부
  note: string;
}

// 변제계획 추정 — 청산가치 보장 원칙 반영.
export function suggestPlan(
  income: IncomeExpense,
  assets: Asset[],
  creditors: Creditor[],
  s: Settings,
  months = 36,
): PlanResult {
  const disposable = disposableIncome(income, s);
  const liq = liquidationValue(assets);
  const debt = totalDebt(creditors);

  // 가용소득 기준 총변제액
  const byIncome = disposable * months;
  // 청산가치 보장: 총변제액 ≥ 청산가치
  const total = Math.max(byIncome, liq);
  const monthly = Math.round(total / months);
  const rate = debt > 0 ? (total / debt) * 100 : 0;

  let note = "";
  if (liq > byIncome) {
    note = "청산가치가 가용소득 총액보다 커서, 월 변제액이 청산가치 기준으로 상향됩니다.";
  } else if (disposable <= 0) {
    note = "가용소득이 0 이하입니다. 소득 증대 또는 파산 검토가 필요할 수 있습니다.";
  } else {
    note = "가용소득 기준으로 변제계획이 산정됩니다.";
  }

  return {
    months,
    monthly,
    total,
    disposable,
    liquidation: liq,
    debt,
    repaymentRate: rate,
    liquidationGuaranteed: total >= liq,
    note,
  };
}

// 개인회생 vs 파산 간단 적합성 진단(참고용 점수)
export interface SuitabilityResult {
  recommend: "rehab" | "bankruptcy" | "either";
  rehabScore: number;
  bankruptcyScore: number;
  reasons: string[];
}

export function assessSuitability(
  income: IncomeExpense,
  assets: Asset[],
  creditors: Creditor[],
  s: Settings,
): SuitabilityResult {
  const disposable = disposableIncome(income, s);
  const debt = totalDebt(creditors);
  const reasons: string[] = [];
  let rehab = 0;
  let bankruptcy = 0;

  if (disposable > 0) {
    rehab += 2;
    reasons.push(`월 가용소득이 ${disposable.toLocaleString()}원으로 변제 여력이 있습니다(회생 유리).`);
  } else {
    bankruptcy += 2;
    reasons.push("월 가용소득이 거의 없어 변제수행이 어렵습니다(파산 검토).");
  }

  if (income.monthlyIncome > 0) {
    rehab += 1;
    reasons.push("정기적 소득이 있어 개인회생 요건에 부합합니다.");
  } else {
    bankruptcy += 1;
    reasons.push("정기 소득이 없어 개인회생 인가가 어려울 수 있습니다.");
  }

  if (debt > 0 && disposable * 36 < debt * 0.05) {
    bankruptcy += 1;
    reasons.push("변제 가능액이 채무 대비 매우 낮아 파산이 더 실효적일 수 있습니다.");
  }

  const recommend =
    rehab > bankruptcy ? "rehab" : bankruptcy > rehab ? "bankruptcy" : "either";

  return { recommend, rehabScore: rehab, bankruptcyScore: bankruptcy, reasons };
}
