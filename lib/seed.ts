import type {
  Case,
  Client,
  Correction,
  CaseDocument,
  ScheduleEvent,
  Subscription,
} from "./types";

const today = new Date();
const iso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const seedClients: Client[] = [
  {
    id: "cl_1",
    name: "김민수",
    phone: "010-2345-6789",
    email: "minsu.kim@example.com",
    kakaoId: "minsu_kim",
    rrnMasked: "850312-1******",
    address: "서울시 강서구 화곡로 123",
    job: "물류센터 근무(정규직)",
    memo: "카드·캐피탈 위주 채무. 배우자 1명, 자녀 1명.",
    createdAt: iso(-40),
  },
  {
    id: "cl_2",
    name: "이정희",
    phone: "010-8765-4321",
    email: "jh.lee@example.com",
    rrnMasked: "780920-2******",
    address: "경기도 부천시 원미구 길주로 45",
    job: "음식점 운영(개인사업자)",
    memo: "사업 부진으로 폐업 직전. 소득 불안정.",
    createdAt: iso(-25),
  },
  {
    id: "cl_3",
    name: "박상우",
    phone: "010-5555-1212",
    email: "swpark@example.com",
    rrnMasked: "920705-1******",
    address: "인천시 미추홀구 주안로 9",
    job: "프리랜서 개발자",
    memo: "신용대출·마이너스통장. 무주택.",
    createdAt: iso(-10),
  },
];

export const seedCases: Case[] = [
  {
    id: "ca_1",
    type: "rehab",
    clientId: "cl_1",
    court: "서울회생법원",
    caseNo: "2026개회12345",
    stage: "correction",
    status: "active",
    assignee: "담당 사무장",
    createdAt: iso(-38),
    filedAt: iso(-20),
    income: {
      monthlyIncome: 3_600_000,
      incomeType: "salary",
      dependents: 3,
    },
    creditors: [
      { id: "cr_1", name: "신한카드", category: "card", principal: 12_400_000, interest: 1_800_000 },
      { id: "cr_2", name: "현대캐피탈", category: "capital", principal: 9_800_000, interest: 1_200_000 },
      { id: "cr_3", name: "OK저축은행", category: "loan", principal: 15_000_000, interest: 3_500_000 },
      { id: "cr_4", name: "카카오뱅크", category: "bank", principal: 7_200_000, interest: 600_000 },
    ],
    assets: [
      { id: "as_1", category: "lease", label: "임차보증금(전세)", value: 30_000_000, exemptAmount: 16_000_000 },
      { id: "as_2", category: "vehicle", label: "아반떼 2018", value: 6_500_000, exemptAmount: 0 },
      { id: "as_3", category: "insurance", label: "종신보험 해약환급금", value: 2_100_000, exemptAmount: 0 },
      { id: "as_4", category: "deposit", label: "예금 합계", value: 850_000, exemptAmount: 0 },
    ],
    plan: { totalMonths: 36, monthlyAmount: 620_000, startDate: iso(15) },
    tags: ["보정중", "카드채무"],
  },
  {
    id: "ca_2",
    type: "bankruptcy",
    clientId: "cl_2",
    court: "인천지방법원",
    caseNo: "2026하단6789",
    stage: "prepare",
    status: "active",
    assignee: "담당 사무장",
    createdAt: iso(-22),
    income: {
      monthlyIncome: 700_000,
      incomeType: "business",
      dependents: 2,
    },
    creditors: [
      { id: "cr_5", name: "국민은행", category: "bank", principal: 28_000_000, interest: 4_100_000 },
      { id: "cr_6", name: "롯데카드", category: "card", principal: 9_300_000, interest: 2_200_000 },
      { id: "cr_7", name: "사채(지인)", category: "private", principal: 8_000_000, interest: 0, isDisputed: true },
    ],
    assets: [
      { id: "as_5", category: "lease", label: "월세보증금", value: 5_000_000, exemptAmount: 5_000_000 },
      { id: "as_6", category: "deposit", label: "예금", value: 120_000, exemptAmount: 0 },
    ],
    tags: ["파산", "폐업"],
  },
  {
    id: "ca_3",
    type: "rehab",
    clientId: "cl_3",
    court: "인천지방법원",
    stage: "consult",
    status: "active",
    assignee: "담당 사무장",
    createdAt: iso(-9),
    income: {
      monthlyIncome: 3_600_000,
      incomeType: "freelance",
      dependents: 1,
    },
    creditors: [
      { id: "cr_8", name: "토스뱅크", category: "bank", principal: 18_000_000, interest: 900_000 },
      { id: "cr_9", name: "우리은행 마이너스", category: "bank", principal: 12_000_000, interest: 700_000 },
      { id: "cr_10", name: "삼성카드", category: "card", principal: 6_400_000, interest: 800_000 },
    ],
    assets: [
      { id: "as_7", category: "deposit", label: "예금", value: 3_200_000, exemptAmount: 0 },
      { id: "as_8", category: "security", label: "주식 계좌", value: 1_800_000, exemptAmount: 0 },
    ],
    tags: ["상담", "프리랜서"],
  },
];

export const seedCorrections: Correction[] = [
  {
    id: "co_1",
    caseId: "ca_1",
    court: "서울회생법원",
    caseNo: "2026개회12345",
    receivedAt: iso(-3),
    dueAt: iso(11),
    status: "in_progress",
    createdAt: iso(-3),
    items: [
      {
        id: "ci_seed_1",
        category: "income",
        originalText:
          "1. 신청인의 최근 3개월 급여명세서 및 소득금액증명원을 제출하여 현재 소득을 소명할 것.",
        summary: "현재 벌고 있는 소득을 법원이 확인할 수 있는 서류를 요구하는 항목입니다.",
        requiredDocs: ["최근 3개월 급여명세서", "재직증명서", "소득금액증명원(홈택스)"],
        procedure: [
          "회사 인사·총무팀에 급여명세서·재직증명서를 요청합니다.",
          "홈택스에서 소득금액증명원을 발급받습니다.",
          "급여 입금 통장 내역도 함께 준비합니다.",
        ],
        clientNote: "소득 서류는 발급에 1~2일 걸릴 수 있으니 미리 준비 부탁드립니다.",
        done: true,
      },
      {
        id: "ci_seed_2",
        category: "asset",
        originalText:
          "2. 신청인 명의 보험의 해약환급금 예상액 확인서를 보험사별로 제출할 것.",
        summary: "가입한 보험을 지금 해지하면 받을 금액(해약환급금)을 확인하는 항목입니다.",
        requiredDocs: ["보험계약 해약환급금 예상액 확인서(보험사 발급)", "보험증권"],
        procedure: [
          "가입한 모든 보험사에 해약환급금 예상액 증명을 요청합니다.",
          "발급받은 확인서를 취합합니다.",
        ],
        clientNote: "보험이 없으면 신용정보원 보험가입조회로 미가입을 확인합니다.",
        done: false,
      },
      {
        id: "ci_seed_3",
        category: "transfer",
        originalText:
          "3. 2025. 10.경 신청인 계좌에서 출금된 5,000,000원의 사용처를 소명할 것.",
        summary:
          "최근의 큰 금액 출금에 대해 어디에 썼는지(사용처)와 경위를 소명하라는 항목입니다.",
        requiredDocs: ["해당 거래 계좌 거래내역", "사용처 증빙", "사실확인서"],
        procedure: [
          "지적된 거래가 발생한 계좌 내역을 출력합니다.",
          "자금 사용처를 증빙과 함께 정리합니다.",
          "편파변제가 아님을 설명하는 사실확인서를 작성합니다.",
        ],
        clientNote: "지적된 거래의 '사용처'가 핵심입니다. 어디에 썼는지 증빙을 모아주세요.",
        done: false,
      },
    ],
  },
];

export const seedDocuments: CaseDocument[] = [
  {
    id: "doc_1",
    caseId: "ca_1",
    type: "rehab_application",
    title: "개인회생 신청서",
    status: "final",
    updatedAt: iso(-20),
  },
  {
    id: "doc_2",
    caseId: "ca_1",
    type: "repayment_plan",
    title: "변제계획안",
    status: "review",
    updatedAt: iso(-5),
  },
  {
    id: "doc_3",
    caseId: "ca_2",
    type: "bankruptcy_application",
    title: "파산신청서",
    status: "draft",
    updatedAt: iso(-2),
  },
];

export const seedEvents: ScheduleEvent[] = [
  {
    id: "ev_1",
    caseId: "ca_1",
    type: "correction_due",
    title: "김민수 보정기한 (서울회생법원)",
    date: iso(11),
    notifyKakao: true,
    notifyEmail: true,
  },
  {
    id: "ev_2",
    caseId: "ca_1",
    type: "repayment",
    title: "김민수 1회차 변제 납입",
    date: iso(15),
  },
  {
    id: "ev_3",
    caseId: "ca_3",
    type: "consult",
    title: "박상우 2차 상담",
    date: iso(2),
    notifyKakao: true,
  },
  {
    id: "ev_4",
    caseId: "ca_2",
    type: "submit",
    title: "이정희 파산신청서 접수 마감",
    date: iso(6),
  },
  {
    id: "ev_5",
    caseId: "ca_1",
    type: "hearing",
    title: "김민수 채권자집회 (예정)",
    date: iso(45),
  },
];

export const seedSubscription: Subscription = {
  tier: "pro",
  seats: 3,
  renewsAt: iso(18),
  aiCreditsUsed: 142,
  aiCreditsLimit: 500,
};
