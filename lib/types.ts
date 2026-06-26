// 회생ON 도메인 모델
// 개인회생 / 개인파산 실무 전 과정을 표현하는 타입 정의.

export type CaseType = "rehab" | "bankruptcy"; // 개인회생 / 개인파산

// 절차 단계. 개인회생과 파산이 단계가 다르므로 공통 키 + 라벨 매핑으로 처리.
export type RehabStage =
  | "consult" // 상담
  | "prepare" // 서류 준비
  | "filed" // 신청서 접수
  | "correction" // 보정 진행
  | "opened" // 개시결정
  | "creditors" // 채권자목록·이의기간
  | "confirmed" // 변제계획 인가
  | "repaying" // 변제 수행
  | "discharged" // 면책
  | "closed"; // 종결/폐지

export type BankruptcyStage =
  | "consult"
  | "prepare"
  | "filed"
  | "correction"
  | "declared" // 파산선고
  | "meeting" // 채권자집회/의견청취
  | "discharge_exam" // 면책심문
  | "discharged" // 면책결정
  | "closed";

export type Stage = RehabStage | BankruptcyStage;

export type CaseStatus = "active" | "onhold" | "won" | "lost" | "closed";

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  kakaoId?: string;
  rrnMasked?: string; // 주민번호 뒤 마스킹 (예: 900101-1******)
  address?: string;
  job?: string;
  memo?: string;
  createdAt: string;
}

export interface Creditor {
  id: string;
  name: string; // 채권자명 (금융사/개인)
  category: "bank" | "card" | "capital" | "loan" | "private" | "public" | "etc";
  principal: number; // 원금
  interest: number; // 이자/연체료
  isDisputed?: boolean;
}

export type AssetCategory =
  | "realestate" // 부동산
  | "vehicle" // 자동차
  | "deposit" // 예금/현금
  | "lease" // 임차보증금
  | "insurance" // 보험 해약환급금
  | "pension" // 퇴직금/연금
  | "security" // 주식·코인
  | "receivable" // 받을 돈
  | "etc";

export interface Asset {
  id: string;
  category: AssetCategory;
  label: string;
  value: number; // 평가액
  exemptAmount?: number; // 면제 인정액
  memo?: string;
}

export interface IncomeExpense {
  monthlyIncome: number; // 월 소득(세후)
  incomeType: "salary" | "business" | "freelance" | "mixed";
  dependents: number; // 부양가족 수(본인 포함 가구원)
  livingCost?: number; // 인정 생계비(미입력 시 기준 중위소득으로 계산)
}

export type CorrectionItemCategory =
  | "income" // 소득 소명
  | "asset" // 재산 소명
  | "debt" // 채무·채권자목록
  | "living" // 생계비
  | "plan" // 변제계획/가용소득
  | "liquidation" // 청산가치
  | "service" // 송달
  | "transfer" // 편파변제/재산처분 소명
  | "document" // 누락서류 보완
  | "etc";

export interface CorrectionItem {
  id: string;
  category: CorrectionItemCategory;
  originalText: string; // 보정명령 원문(해당 항목)
  summary?: string; // AI: 쉬운 말 요약
  requiredDocs?: string[]; // AI: 필요서류
  procedure?: string[]; // AI: 처리 절차(단계)
  clientNote?: string; // AI: 의뢰인 안내 멘트
  done?: boolean;
}

export interface Correction {
  id: string;
  caseId: string;
  court: string;
  caseNo?: string;
  receivedAt: string; // 보정명령 수령일
  dueAt: string; // 보정기한
  items: CorrectionItem[];
  status: "open" | "in_progress" | "submitted";
  createdAt: string;
}

export type DocType =
  | "rehab_application" // 개인회생 신청서
  | "creditor_list" // 채권자목록
  | "asset_list" // 재산목록
  | "income_expense" // 수입지출목록
  | "statement" // 진술서
  | "repayment_plan" // 변제계획안
  | "bankruptcy_application" // 파산신청서
  | "discharge_application" // 면책신청서
  | "correction_reply"; // 보정서(답변서)

export interface CaseDocument {
  id: string;
  caseId: string;
  type: DocType;
  title: string;
  status: "draft" | "review" | "final";
  content?: string;
  updatedAt: string;
}

export type EventType =
  | "correction_due" // 보정기한
  | "hearing" // 채권자집회/심문
  | "decision" // 개시·선고·인가·면책 결정
  | "repayment" // 변제 납입일
  | "submit" // 제출 마감
  | "consult" // 상담
  | "custom";

export interface ScheduleEvent {
  id: string;
  caseId?: string;
  type: EventType;
  title: string;
  date: string; // ISO date
  done?: boolean;
  notifyKakao?: boolean;
  notifyEmail?: boolean;
  memo?: string;
}

export interface RepaymentPlan {
  totalMonths: number; // 변제기간(개월)
  monthlyAmount: number; // 월 변제액
  startDate?: string;
}

export interface Case {
  id: string;
  type: CaseType;
  clientId: string;
  court: string; // 관할법원
  caseNo?: string; // 사건번호
  stage: Stage;
  status: CaseStatus;
  assignee: string; // 담당자
  createdAt: string;
  filedAt?: string;
  openedAt?: string;
  income: IncomeExpense;
  creditors: Creditor[];
  assets: Asset[];
  plan?: RepaymentPlan;
  tags?: string[];
}

// 수임료 분납(관리자 관리) — 의뢰인이 사무소에 내는 수임료의 분할 납부
export interface FeeInstallment {
  id: string;
  dueDate: string; // 약정 납부일 (ISO)
  amount: number; // 약정 금액
  paidAmount: number; // 실제 납부액(0이면 미납)
  paidAt?: string; // 완납일
  memo?: string;
}

export interface FeePlan {
  id: string;
  caseId: string;
  totalFee: number; // 총 수임료
  installments: FeeInstallment[];
  memo?: string;
  createdAt: string;
}

// 서류 체크리스트 — 사건별 서류 준비 상태
export type DocCheckStatus = "todo" | "requested" | "done" | "na"; // 미비/발급요청/완료/해당없음
export interface CaseDocCheck {
  id: string;
  caseId: string;
  docKey: string; // 마스터 서류 key (lib/docChecklist)
  status: DocCheckStatus;
  receivedAt?: string;
  memo?: string;
}

// 사건기록부 — 직원이 사건마다 남기는 시간순 업무 기록
export interface CaseLog {
  id: string;
  caseId: string;
  author: string; // 작성자
  body: string; // 기록 내용
  pinned?: boolean; // 특이사항 고정
  createdAt: string;
}

export type PlanTier = "free" | "pro" | "team";

export interface Subscription {
  tier: PlanTier;
  seats: number;
  renewsAt: string;
  aiCreditsUsed: number;
  aiCreditsLimit: number;
}

export interface Settings {
  firmName: string;
  // 기준 중위소득(가구원수별 월액). 매년 고시되므로 설정에서 수정 가능.
  medianIncomeByHousehold: Record<number, number>;
  // 생계비 인정 비율(기준 중위소득 대비). 통상 60% 사용.
  livingCostRatio: number;
  baseYear: number;
}
