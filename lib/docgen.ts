// 규칙기반 서류 초안 생성 (AI 미사용 시 폴백)
import type { Case, Client, DocType } from "./types";
import { won } from "./format";
import {
  totalDebt,
  liquidationValue,
  disposableIncome,
  livingCost,
  suggestPlan,
} from "./calc";
import { DEFAULT_SETTINGS } from "./calc";

export function generateDocDraft(type: DocType, c: Case, cl: Client): string {
  const s = DEFAULT_SETTINGS;
  const debt = totalDebt(c.creditors);
  const L: string[] = [];
  const H = (t: string) => L.push(t, "");

  switch (type) {
    case "creditor_list": {
      H("개인회생채권자목록");
      L.push(`사건: ${c.caseNo ?? "(미접수)"}   채무자: ${cl.name}`, "");
      L.push("순번 | 채권자 | 원금 | 이자·지연손해금 | 합계");
      c.creditors.forEach((cr, i) =>
        L.push(`${i + 1} | ${cr.name} | ${won(cr.principal)} | ${won(cr.interest)} | ${won(cr.principal + cr.interest)}`),
      );
      L.push("", `합계: ${won(debt)}`);
      break;
    }
    case "asset_list": {
      H("재산목록");
      L.push(`채무자: ${cl.name}`, "");
      c.assets.forEach((a, i) =>
        L.push(`${i + 1}. ${a.label} — 평가액 ${won(a.value)} (면제 ${won(a.exemptAmount || 0)})`),
      );
      L.push("", `청산가치 합계: ${won(liquidationValue(c.assets))}`);
      break;
    }
    case "income_expense": {
      H("수입 및 지출에 관한 목록");
      L.push(`채무자: ${cl.name}   가구원수: ${c.income.dependents}인`, "");
      L.push(`월 소득(세후): ${won(c.income.monthlyIncome)}`);
      L.push(`인정 생계비: ${won(livingCost(c.income, s))}  (기준 중위소득 ${s.livingCostRatio * 100}%)`);
      L.push(`월 가용소득: ${won(disposableIncome(c.income, s))}`);
      break;
    }
    case "repayment_plan": {
      const plan = suggestPlan(c.income, c.assets, c.creditors, s, c.plan?.totalMonths ?? 36);
      H("변제계획안");
      L.push(`채무자: ${cl.name}   사건: ${c.caseNo ?? "(미접수)"}`, "");
      L.push(`1. 변제기간: ${plan.months}개월`);
      L.push(`2. 월 변제액: ${won(plan.monthly)}`);
      L.push(`3. 총 변제예정액: ${won(plan.total)}`);
      L.push(`4. 변제율: ${plan.repaymentRate.toFixed(1)}%`);
      L.push(`5. 청산가치: ${won(plan.liquidation)} — 청산가치 보장 ${plan.liquidationGuaranteed ? "충족" : "미충족"}`);
      L.push("", `6. 변제는 매월 균등 분할하여 회생위원에게 임치하는 방법으로 수행합니다.`);
      break;
    }
    case "rehab_application": {
      H("개인회생절차 개시신청서");
      L.push(`채무자  성명: ${cl.name}   연락처: ${cl.phone}`);
      L.push(`주소: ${cl.address ?? "____________"}`, "");
      L.push(`신 청 취 지`);
      L.push(`「채무자에 대하여 개인회생절차를 개시한다」 라는 결정을 구합니다.`, "");
      L.push(`신 청 원 인`);
      L.push(`1. 채무자는 ${cl.job ?? "근로"}에 종사하며 정기적 소득(월 ${won(c.income.monthlyIncome)})이 있습니다.`);
      L.push(`2. 총 채무액은 ${won(debt)}으로 변제가 어려운 지급불능 상태입니다.`);
      L.push(`3. 월 가용소득 ${won(disposableIncome(c.income, s))}으로 변제계획을 수행하고자 합니다.`);
      break;
    }
    case "bankruptcy_application": {
      H("파산 및 면책 신청서");
      L.push(`채무자  성명: ${cl.name}   연락처: ${cl.phone}`, "");
      L.push(`신 청 취 지`);
      L.push(`「채무자에 대하여 파산을 선고한다」, 「채무자를 면책한다」 라는 결정을 구합니다.`, "");
      L.push(`신 청 원 인`);
      L.push(`1. 총 채무액 ${won(debt)}에 비하여 변제 자력이 없어 지급불능 상태입니다.`);
      L.push(`2. 월 소득 ${won(c.income.monthlyIncome)}으로 생계 유지가 어렵습니다.`);
      break;
    }
    case "discharge_application": {
      H("면책신청서");
      L.push(`채무자: ${cl.name}`, "");
      L.push(`위 채무자는 파산선고를 받았는바, 면책결정을 구합니다.`);
      break;
    }
    case "statement": {
      H("진술서");
      L.push(`채무자: ${cl.name}`, "");
      L.push(`1. 채무 발생 경위: ____________`);
      L.push(`2. 현재 생활 상황: 가구원 ${c.income.dependents}인, 월 소득 ${won(c.income.monthlyIncome)}`);
      L.push(`3. 재산 보유 현황: 청산가치 ${won(liquidationValue(c.assets))}`);
      break;
    }
    default:
      H("문서 초안");
      L.push(`채무자: ${cl.name}`);
  }

  L.push("", "— 본 초안은 자동 생성되었습니다. 담당자 검토 후 사용하세요. —");
  return L.join("\n");
}
