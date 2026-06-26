import type {
  CaseType,
  Stage,
  CorrectionItemCategory,
  AssetCategory,
  DocType,
  EventType,
  ReferralReason,
  ReferralTarget,
  ReferralStatus,
} from "./types";

export const won = (n: number) =>
  new Intl.NumberFormat("ko-KR").format(Math.round(n || 0)) + "원";

export const manwon = (n: number) => {
  const m = (n || 0) / 10000;
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(m) + "만원";
};

export const pct = (n: number, digits = 1) => `${(n || 0).toFixed(digits)}%`;

export const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

export const daysUntil = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
};

export const ddayLabel = (iso?: string) => {
  const n = daysUntil(iso);
  if (n === null) return "";
  if (n === 0) return "D-DAY";
  return n > 0 ? `D-${n}` : `D+${Math.abs(n)}`;
};

export const caseTypeLabel: Record<CaseType, string> = {
  rehab: "개인회생",
  bankruptcy: "개인파산",
};

export const stageLabel: Record<Stage, string> = {
  consult: "상담",
  prepare: "서류 준비",
  filed: "신청서 접수",
  correction: "보정 진행",
  opened: "개시결정",
  creditors: "채권자목록·이의",
  confirmed: "변제계획 인가",
  repaying: "변제 수행",
  declared: "파산선고",
  meeting: "채권자집회",
  discharge_exam: "면책심문",
  discharged: "면책",
  closed: "종결",
};

export const REHAB_STAGES: Stage[] = [
  "consult",
  "prepare",
  "filed",
  "correction",
  "opened",
  "creditors",
  "confirmed",
  "repaying",
  "discharged",
  "closed",
];

export const BANKRUPTCY_STAGES: Stage[] = [
  "consult",
  "prepare",
  "filed",
  "correction",
  "declared",
  "meeting",
  "discharge_exam",
  "discharged",
  "closed",
];

export const stagesFor = (t: CaseType) =>
  t === "rehab" ? REHAB_STAGES : BANKRUPTCY_STAGES;

export const correctionCatLabel: Record<CorrectionItemCategory, string> = {
  income: "소득 소명",
  asset: "재산 소명",
  debt: "채무·채권자목록",
  living: "생계비",
  plan: "변제계획·가용소득",
  liquidation: "청산가치",
  service: "송달",
  transfer: "편파변제·재산처분",
  document: "누락서류",
  etc: "기타",
};

export const assetCatLabel: Record<AssetCategory, string> = {
  realestate: "부동산",
  vehicle: "자동차",
  deposit: "예금·현금",
  lease: "임차보증금",
  insurance: "보험 해약환급금",
  pension: "퇴직금·연금",
  security: "주식·가상자산",
  receivable: "받을 채권",
  etc: "기타",
};

export const docTypeLabel: Record<DocType, string> = {
  rehab_application: "개인회생 신청서",
  creditor_list: "채권자목록",
  asset_list: "재산목록",
  income_expense: "수입·지출목록",
  statement: "진술서",
  repayment_plan: "변제계획안",
  bankruptcy_application: "파산신청서",
  discharge_application: "면책신청서",
  correction_reply: "보정서(답변서)",
};

export const eventTypeLabel: Record<EventType, string> = {
  correction_due: "보정기한",
  hearing: "기일",
  decision: "결정",
  repayment: "변제 납입",
  submit: "제출 마감",
  consult: "상담",
  custom: "일정",
};

export const referralReasonLabel: Record<ReferralReason, string> = {
  rehab_dismissed: "회생 기각",
  rehab_abolished: "회생 폐지(인가후)",
  rehab_denied: "인가전 폐지·불인가",
  bankruptcy_denied: "파산·면책 기각",
  etc: "기타",
};

export const referralTargetLabel: Record<ReferralTarget, string> = {
  credit_workout: "신복 개인워크아웃",
  credit_prework: "신복 프리워크아웃",
  fresh_start: "새출발기금",
  refile: "회생 재신청",
  etc: "기타",
};

export const referralStatusLabel: Record<ReferralStatus, string> = {
  candidate: "대상선정",
  consulting: "상담",
  applied: "접수",
  in_progress: "진행중",
  done: "완료",
  hold: "보류",
};

export const referralStatusTone: Record<ReferralStatus, string> = {
  candidate: "muted",
  consulting: "info",
  applied: "brand",
  in_progress: "warning",
  done: "success",
  hold: "muted",
};

export const eventTypeColor: Record<EventType, string> = {
  correction_due: "danger",
  hearing: "warning",
  decision: "brand",
  repayment: "success",
  submit: "warning",
  consult: "info",
  custom: "muted",
};
