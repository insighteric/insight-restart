// CODEF 공공·행정 서류 자동발급 래퍼 (서버 전용)
// CODEF_CLIENT_ID/SECRET 가 설정되면 실연동, 없으면 목업(mock)으로 동작한다.
// 금융(은행·카드) 데이터는 2022.1 스크래핑 금지 → 마이데이터 영역으로 본 래퍼 대상 아님.

// 자동발급 지원 서류 (docChecklist의 key → CODEF 상품 식별)
// product/organization 값은 실제 연동 시 CODEF 개발자포털 스펙으로 채운다.
export const CODEF_PRODUCTS: Record<string, { label: string; org: string }> = {
  resident_copy: { label: "주민등록등본", org: "정부24" },
  resident_abstract: { label: "주민등록초본", org: "정부24" },
  family_detail: { label: "가족관계증명서(상세)", org: "대법원" },
  marriage_cert: { label: "혼인관계증명서(상세)", org: "대법원" },
  basic_cert: { label: "기본증명서(상세)", org: "대법원" },
  income_cert: { label: "소득금액증명원", org: "홈택스" },
  withholding: { label: "근로소득 원천징수영수증", org: "홈택스" },
  biz_reg: { label: "사업자등록증명", org: "홈택스" },
  vat_base: { label: "부가가치세 과세표준증명", org: "홈택스" },
  no_income: { label: "사실증명(무소득 등)", org: "홈택스" },
  nps_record: { label: "국민연금 가입·납부내역", org: "국민연금공단" },
  nhis_qual: { label: "건강보험 자격득실확인서", org: "국민건강보험공단" },
  nhis_pay: { label: "건강보험료 납부확인서", org: "국민건강보험공단" },
  employ_ins: { label: "고용보험 피보험자격 이력", org: "근로복지공단" },
  estate_reg: { label: "부동산 등기부등본", org: "인터넷등기소" },
  car_reg: { label: "자동차 등록원부", org: "정부24" },
};

export const isCodefDoc = (docKey: string) => docKey in CODEF_PRODUCTS;

export function codefEnabled(): boolean {
  return !!(process.env.CODEF_CLIENT_ID && process.env.CODEF_CLIENT_SECRET);
}

export interface IssueResult {
  ok: boolean;
  mock: boolean;
  docKey: string;
  label: string;
  org: string;
  issuedAt: string; // YYYY-MM-DD
  message: string;
  // 실연동 시 채워질 필드(목업에선 비움)
  fileName?: string;
}

// 서류 1건 발급 요청.
// 실연동: 의뢰인 간편인증(카카오/PASS) 또는 공동인증 → CODEF API.
// 목업: 즉시 성공으로 시뮬레이션(실제 발급 없음).
export async function issueDocument(opts: {
  docKey: string;
  clientName?: string;
}): Promise<IssueResult> {
  const product = CODEF_PRODUCTS[opts.docKey];
  const issuedAt = new Date().toISOString().slice(0, 10);
  if (!product) {
    return { ok: false, mock: true, docKey: opts.docKey, label: opts.docKey, org: "", issuedAt, message: "자동발급 미지원 서류입니다." };
  }

  if (!codefEnabled()) {
    // 목업: CODEF 키 미설정 — 흐름만 시뮬레이션
    return {
      ok: true,
      mock: true,
      docKey: opts.docKey,
      label: product.label,
      org: product.org,
      issuedAt,
      message: `[목업] ${product.org} ${product.label} 자동발급 흐름(실제 발급 아님). CODEF 키 설정 시 실연동됩니다.`,
    };
  }

  // ── 실연동 스켈레톤 (CODEF 계약·키 설정 후 실제 동작 검증 필요) ──
  // 1) OAuth2 토큰 발급 (client_id/secret)
  // 2) 의뢰인 간편인증/공동인증 → 상품 엔드포인트 호출(2-way 인증 처리)
  // 3) 발급 결과(PDF/데이터) 수신
  // 실제 파라미터·엔드포인트는 developer.codef.io 스펙을 따른다.
  try {
    // TODO: 실제 CODEF 호출 구현 (계약 후 샌드박스로 검증)
    return {
      ok: false,
      mock: false,
      docKey: opts.docKey,
      label: product.label,
      org: product.org,
      issuedAt,
      message: "CODEF 실연동은 계약·샌드박스 검증 후 활성화됩니다.",
    };
  } catch (e) {
    return { ok: false, mock: false, docKey: opts.docKey, label: product.label, org: product.org, issuedAt, message: `발급 실패: ${(e as Error).message}` };
  }
}
