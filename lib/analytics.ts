// 경영(운영·회계) 통계 계산 — 순수 함수
// 매출 = 납입된 수임료, 계약 = 신규 사건(수임), 미수금 = 미납 수임료
import type { Case, FeePlan } from "./types";
import { feeStatus } from "./fees";

const d10 = (s?: string) => (s || "").slice(0, 10);

export interface Paid {
  date: string; // 납입일(없으면 약정일)
  amount: number;
  caseId: string;
}

// 납입 완료 금액(회차별)
export function collectedPayments(plans: FeePlan[]): Paid[] {
  return plans
    .flatMap((p) =>
      (p.installments || [])
        .filter((i) => (i.paidAmount || 0) > 0)
        .map((i) => ({ date: d10(i.paidAt || i.dueDate), amount: i.paidAmount || 0, caseId: p.caseId })),
    )
    .filter((x) => x.date);
}

export const sumInRange = (items: { date: string; amount: number }[], from: string, to: string) =>
  items.filter((i) => i.date >= from && i.date <= to).reduce((s, i) => s + i.amount, 0);

export const casesInRange = (cases: Case[], from: string, to: string) =>
  cases.filter((c) => {
    const d = d10(c.createdAt);
    return d >= from && d <= to;
  });

export interface MonthPoint {
  ym: string; // YYYY-MM
  label: string; // M월
  revenue: number;
  contracts: number;
}

// 최근 N개월 (YYYY-MM) 목록 — today: YYYY-MM-DD
export function lastMonths(today: string, n: number): string[] {
  const [y, m] = today.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(y, m - 1 - i, 1);
    out.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function monthlySeries(plans: FeePlan[], cases: Case[], months: string[]): MonthPoint[] {
  const paid = collectedPayments(plans);
  return months.map((ym) => ({
    ym,
    label: `${Number(ym.slice(5))}월`,
    revenue: paid.filter((p) => p.date.startsWith(ym)).reduce((s, p) => s + p.amount, 0),
    contracts: cases.filter((c) => d10(c.createdAt).startsWith(ym)).length,
  }));
}

export interface Receivables {
  outstanding: number; // 총 미수금
  overdue: number; // 연체 금액
  overdueCount: number;
  byCase: { caseId: string; unpaid: number; overdue: number }[];
}

export function receivables(plans: FeePlan[]): Receivables {
  let outstanding = 0,
    overdue = 0,
    overdueCount = 0;
  const byCase: Receivables["byCase"] = [];
  for (const p of plans) {
    const s = feeStatus(p);
    if (!s) continue;
    outstanding += s.unpaid;
    overdue += s.overdueAmount;
    if (s.isOverdue) overdueCount++;
    if (s.unpaid > 0) byCase.push({ caseId: p.caseId, unpaid: s.unpaid, overdue: s.overdueAmount });
  }
  byCase.sort((a, b) => b.unpaid - a.unpaid);
  return { outstanding, overdue, overdueCount, byCase };
}

// 계약(수임) 약정액 합계 — 기간 내 생성 사건의 수임료 총액
export function contractedValue(casesInRange: Case[], plans: FeePlan[]): number {
  const planByCase = new Map(plans.map((p) => [p.caseId, p]));
  return casesInRange.reduce((s, c) => {
    const p = planByCase.get(c.id);
    return s + (p ? p.totalFee || 0 : 0);
  }, 0);
}
