// 개인회생·파산 표준 서류 마스터 목록 (접수서류 + 보정서류)
// 발급처·온라인 발급 링크 포함. 사건별 체크 상태는 store(docChecks)에 저장.

export type DocCategory =
  | "identity" // 신분·가족·주거
  | "income" // 소득
  | "debt" // 채무·신용
  | "asset" // 재산
  | "transaction" // 거래내역
  | "living" // 생계·가족
  | "filing" // 신청서류(작성)
  | "correction"; // 보정 대응

export type AppliesTo = "both" | "rehab" | "bankruptcy";

export interface DocSpec {
  key: string;
  name: string;
  category: DocCategory;
  issuer: string; // 발급처
  url?: string; // 온라인 발급/조회 링크
  appliesTo: AppliesTo;
  note?: string;
}

export const DOC_CATEGORY_LABEL: Record<DocCategory, string> = {
  identity: "신분·가족·주거",
  income: "소득",
  debt: "채무·신용",
  asset: "재산",
  transaction: "거래내역",
  living: "생계·가족",
  filing: "신청서류(작성)",
  correction: "보정 대응",
};

export const DOC_MASTER: DocSpec[] = [
  // ── 신분·가족·주거 ──
  { key: "resident_copy", name: "주민등록등본", category: "identity", issuer: "정부24", url: "https://www.gov.kr", appliesTo: "both" },
  { key: "resident_abstract", name: "주민등록초본(주소이력 포함)", category: "identity", issuer: "정부24", url: "https://www.gov.kr", appliesTo: "both" },
  { key: "family_detail", name: "가족관계증명서(상세)", category: "identity", issuer: "대법원 전자가족관계등록", url: "https://efamily.scourt.go.kr", appliesTo: "both" },
  { key: "marriage_cert", name: "혼인관계증명서(상세)", category: "identity", issuer: "대법원 전자가족관계등록", url: "https://efamily.scourt.go.kr", appliesTo: "both" },
  { key: "basic_cert", name: "기본증명서(상세)", category: "identity", issuer: "대법원 전자가족관계등록", url: "https://efamily.scourt.go.kr", appliesTo: "both" },
  { key: "id_copy", name: "주민등록증(또는 운전면허증) 사본", category: "identity", issuer: "본인 소지", appliesTo: "both" },
  { key: "household_view", name: "전입세대열람내역", category: "identity", issuer: "주민센터(방문)", appliesTo: "bankruptcy", note: "거주관계 소명" },

  // ── 소득 ──
  { key: "income_cert", name: "소득금액증명원", category: "income", issuer: "홈택스", url: "https://www.hometax.go.kr", appliesTo: "both" },
  { key: "withholding", name: "근로소득 원천징수영수증", category: "income", issuer: "홈택스/회사", url: "https://www.hometax.go.kr", appliesTo: "both" },
  { key: "payslip", name: "급여명세서(최근 3개월)", category: "income", issuer: "회사", appliesTo: "rehab" },
  { key: "employ_cert", name: "재직증명서", category: "income", issuer: "회사", appliesTo: "rehab" },
  { key: "biz_reg", name: "사업자등록증명", category: "income", issuer: "홈택스", url: "https://www.hometax.go.kr", appliesTo: "both", note: "개인사업자" },
  { key: "vat_base", name: "부가가치세 과세표준증명", category: "income", issuer: "홈택스", url: "https://www.hometax.go.kr", appliesTo: "both", note: "개인사업자" },
  { key: "no_income", name: "사실증명(신고사실 없음/무소득)", category: "income", issuer: "홈택스", url: "https://www.hometax.go.kr", appliesTo: "both", note: "무소득자" },
  { key: "nps_record", name: "국민연금 가입·납부내역", category: "income", issuer: "국민연금공단", url: "https://www.nps.or.kr", appliesTo: "both" },
  { key: "nhis_qual", name: "건강보험 자격득실확인서", category: "income", issuer: "국민건강보험공단", url: "https://www.nhis.or.kr", appliesTo: "both" },
  { key: "nhis_pay", name: "건강보험료 납부확인서", category: "income", issuer: "국민건강보험공단", url: "https://www.nhis.or.kr", appliesTo: "both" },
  { key: "employ_ins", name: "고용보험 피보험자격 이력내역서", category: "income", issuer: "고용·산재보험 토탈서비스", url: "https://total.comwel.or.kr", appliesTo: "both" },

  // ── 채무·신용 ──
  { key: "credit_report", name: "신용정보조회서(전체 채무)", category: "debt", issuer: "한국신용정보원 크레딧포유", url: "https://www.credit4u.or.kr", appliesTo: "both", note: "NICE지키미·올크레딧도 가능" },
  { key: "debt_cert", name: "채권자별 부채(잔액)증명서", category: "debt", issuer: "각 금융기관", appliesTo: "both", note: "채권자목록 작성 근거" },
  { key: "loan_contract", name: "대출거래약정서·거래내역", category: "debt", issuer: "각 금융기관", appliesTo: "both" },
  { key: "guarantee_doc", name: "보증채무 관련 서류", category: "debt", issuer: "해당 기관", appliesTo: "both", note: "보증인 있는 경우" },

  // ── 재산 ──
  { key: "estate_reg", name: "부동산 등기부등본", category: "asset", issuer: "인터넷등기소", url: "http://www.iros.go.kr", appliesTo: "both", note: "소유 시" },
  { key: "estate_price", name: "부동산 시세·공시가격 자료", category: "asset", issuer: "KB시세/부동산공시가격알리미", url: "https://www.realtyprice.kr", appliesTo: "both" },
  { key: "car_reg", name: "자동차 등록원부(갑·을)", category: "asset", issuer: "자동차민원 대국민포털", url: "https://www.ecar.go.kr", appliesTo: "both", note: "차량 소유 시" },
  { key: "car_price", name: "자동차 시세자료", category: "asset", issuer: "보험개발원/중고차시세", appliesTo: "both" },
  { key: "lease_contract", name: "임대차계약서 사본", category: "asset", issuer: "본인 소지", appliesTo: "both", note: "임차보증금" },
  { key: "deposit_cert", name: "예금 잔액증명서", category: "asset", issuer: "거래 은행", appliesTo: "both" },
  { key: "insurance_list", name: "보험가입내역(통합조회)", category: "asset", issuer: "내보험찾아줌", url: "https://cont.insure.or.kr", appliesTo: "both" },
  { key: "insurance_surrender", name: "보험 해약환급금 예상액 확인서", category: "asset", issuer: "각 보험사", appliesTo: "both" },
  { key: "severance", name: "퇴직금 추계액 확인서", category: "asset", issuer: "회사", appliesTo: "both", note: "재직 시" },
  { key: "security_balance", name: "주식·증권 잔고증명서", category: "asset", issuer: "증권사", appliesTo: "both", note: "보유 시" },
  { key: "crypto_balance", name: "가상자산 잔고·거래내역", category: "asset", issuer: "코인 거래소", appliesTo: "both", note: "보유 시" },
  { key: "receivable_doc", name: "받을 채권(임대·대여금 등) 자료", category: "asset", issuer: "본인 소지", appliesTo: "both", note: "있는 경우" },

  // ── 거래내역 ──
  { key: "bank_txn", name: "입출금 통장 거래내역(1~2년)", category: "transaction", issuer: "거래 은행", appliesTo: "both", note: "전 계좌" },
  { key: "card_txn", name: "카드 이용내역서", category: "transaction", issuer: "각 카드사", appliesTo: "both" },
  { key: "invest_txn", name: "증권·코인 거래내역", category: "transaction", issuer: "증권사/거래소", appliesTo: "both", note: "해당 시" },

  // ── 생계·가족 ──
  { key: "dependent_income", name: "부양가족 소득 관련 자료", category: "living", issuer: "홈택스 등", url: "https://www.hometax.go.kr", appliesTo: "both", note: "맞벌이 등" },
  { key: "living_doc", name: "생계비 소명자료(가계수지표)", category: "living", issuer: "본인 작성", appliesTo: "rehab" },
  { key: "medical_doc", name: "진단서·장애인증명 등", category: "living", issuer: "병원/주민센터", appliesTo: "both", note: "추가 생계비 사유 시" },
  { key: "rent_proof", name: "월세·관리비 납부 증빙", category: "living", issuer: "본인 소지", appliesTo: "both", note: "주거비 소명" },

  // ── 신청서류(작성) ──
  { key: "application", name: "개인회생/파산 신청서", category: "filing", issuer: "사무소 작성", appliesTo: "both" },
  { key: "creditor_list", name: "채권자목록", category: "filing", issuer: "사무소 작성", appliesTo: "both" },
  { key: "asset_list", name: "재산목록", category: "filing", issuer: "사무소 작성", appliesTo: "both" },
  { key: "income_expense", name: "수입·지출목록", category: "filing", issuer: "사무소 작성", appliesTo: "both" },
  { key: "repay_plan", name: "변제계획안", category: "filing", issuer: "사무소 작성", appliesTo: "rehab" },
  { key: "statement", name: "진술서", category: "filing", issuer: "사무소 작성", appliesTo: "both" },
  { key: "poa", name: "위임장", category: "filing", issuer: "사무소 작성", appliesTo: "both" },
  { key: "court_fee", name: "송달료·인지대 납부", category: "filing", issuer: "법원 납부", appliesTo: "both" },

  // ── 보정 대응 ──
  { key: "fact_confirm", name: "사실확인서(자금사용처 등)", category: "correction", issuer: "사무소 작성", appliesTo: "both", note: "보정 시" },
  { key: "extra_proof", name: "추가 소명자료(보정명령별)", category: "correction", issuer: "건별", appliesTo: "both", note: "보정명령 항목에 따라" },
];

export const docByKey = (key: string) => DOC_MASTER.find((d) => d.key === key);

// 사건 유형에 맞는 서류만
export const docsForType = (t: "rehab" | "bankruptcy") =>
  DOC_MASTER.filter((d) => d.appliesTo === "both" || d.appliesTo === t);
