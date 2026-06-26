// 수임료 분납 상태 계산 (순수 함수)
import type { FeePlan } from "./types";

export interface FeeStatus {
  total: number; // 총 수임료
  scheduled: number; // 약정 합계(회차 금액 합)
  paid: number; // 납입 합계
  unpaid: number; // 미납 합계 (총액 - 납입)
  overdueAmount: number; // 연체 금액 (오늘 이전 약정 중 미납분)
  overdueCount: number; // 연체 회차 수
  nextDue?: { dueDate: string; amount: number }; // 다음 납부 예정(미납분 중 가장 이른 것)
  isOverdue: boolean;
  isComplete: boolean; // 완납 여부
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function feeStatus(plan: FeePlan | undefined, today = todayISO()): FeeStatus | null {
  if (!plan) return null;
  const inst = plan.installments ?? [];
  const scheduled = inst.reduce((s, i) => s + (i.amount || 0), 0);
  const paid = inst.reduce((s, i) => s + (i.paidAmount || 0), 0);
  const total = plan.totalFee || scheduled;
  const unpaid = Math.max(0, total - paid);

  let overdueAmount = 0;
  let overdueCount = 0;
  const pendingFuture: { dueDate: string; amount: number }[] = [];
  for (const i of inst) {
    const remain = Math.max(0, (i.amount || 0) - (i.paidAmount || 0));
    if (remain <= 0) continue;
    if (i.dueDate && i.dueDate <= today) {
      overdueAmount += remain;
      overdueCount += 1;
    } else {
      pendingFuture.push({ dueDate: i.dueDate, amount: remain });
    }
  }
  pendingFuture.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    total,
    scheduled,
    paid,
    unpaid,
    overdueAmount,
    overdueCount,
    nextDue: overdueAmount > 0
      ? { dueDate: inst.find((i) => i.dueDate <= today && (i.amount - i.paidAmount) > 0)!.dueDate, amount: overdueAmount }
      : pendingFuture[0],
    isOverdue: overdueAmount > 0,
    isComplete: unpaid <= 0 && total > 0,
  };
}
