import type { CorrectionItem, CorrectionItemCategory } from "./types";

// 보정명령 지식베이스
// 실무에서 자주 나오는 보정 항목을 키워드로 분류하고,
// 의뢰인용 쉬운 설명 / 필요서류 / 처리절차 템플릿을 제공한다.
// (AI 미사용 시 폴백, AI 사용 시 컨텍스트로 활용)

interface Rule {
  category: CorrectionItemCategory;
  keywords: string[];
  summary: string;
  requiredDocs: string[];
  procedure: string[];
}

export const CORRECTION_RULES: Rule[] = [
  {
    category: "income",
    keywords: ["급여", "근로소득", "월급", "재직", "원천징수", "갑근세", "소득금액증명"],
    summary:
      "현재 벌고 있는 소득을 법원이 객관적으로 확인할 수 있는 서류를 요구하는 항목입니다.",
    requiredDocs: [
      "최근 3개월 급여명세서",
      "재직증명서",
      "근로소득원천징수영수증(전년도)",
      "소득금액증명원(국세청 홈택스/세무서 발급)",
    ],
    procedure: [
      "회사 인사·총무팀에 급여명세서와 재직증명서를 요청합니다.",
      "홈택스(또는 가까운 세무서)에서 소득금액증명원을 발급받습니다.",
      "급여가 통장으로 입금된 내역(최근 3~6개월)도 함께 준비합니다.",
      "발급받은 서류를 사진/스캔하여 담당자에게 전달합니다.",
    ],
  },
  {
    category: "income",
    keywords: ["사업소득", "사업자", "매출", "부가가치세", "사업장", "프리랜서", "3.3"],
    summary:
      "사업·프리랜서 소득의 실제 규모를 확인하기 위한 자료를 요구하는 항목입니다.",
    requiredDocs: [
      "사업자등록증(해당 시)",
      "부가가치세 과세표준증명원 또는 면세사업자 수입금액증명",
      "최근 6개월 사업용 계좌 거래내역",
      "소득금액증명원(홈택스)",
    ],
    procedure: [
      "홈택스에서 부가가치세 과세표준증명 또는 수입금액증명을 발급받습니다.",
      "사업용(또는 매출 입금) 계좌의 최근 6개월 거래내역을 출력합니다.",
      "월평균 수입과 필요경비를 정리하여 담당자에게 전달합니다.",
    ],
  },
  {
    category: "asset",
    keywords: ["부동산", "등기부", "임야", "토지", "아파트", "주택", "공시지가"],
    summary:
      "보유 중이거나 과거에 보유했던 부동산을 확인하기 위한 항목입니다.",
    requiredDocs: [
      "부동산 등기사항전부증명서(등기부등본)",
      "공시지가/시세 확인자료",
      "(처분했다면) 매매계약서 및 처분대금 사용내역",
    ],
    procedure: [
      "인터넷등기소에서 본인 명의 부동산 등기부등본을 발급합니다.",
      "보유 부동산이 없다면 '지방세 세목별 과세증명서'로 무재산을 소명합니다.",
      "최근 2년 내 처분한 부동산이 있다면 계약서와 대금 사용처를 정리합니다.",
    ],
  },
  {
    category: "asset",
    keywords: ["자동차", "차량", "이륜", "오토바이", "자동차등록"],
    summary: "보유 차량의 가치와 명의를 확인하기 위한 항목입니다.",
    requiredDocs: [
      "자동차등록원부(갑·을구)",
      "중고차 시세 확인자료(보험개발원/중고차 시세표)",
      "(할부·리스 시) 잔여 할부금 확인서",
    ],
    procedure: [
      "정부24 또는 차량등록사업소에서 자동차등록원부를 발급합니다.",
      "보험개발원 차량기준가액 등으로 현재 시세를 확인합니다.",
      "할부가 남아 있으면 캐피탈사에서 잔액증명을 받습니다.",
    ],
  },
  {
    category: "asset",
    keywords: ["보험", "해약환급금", "해지환급", "청약"],
    summary:
      "가입한 보험을 지금 해지하면 받을 수 있는 금액(해약환급금)을 확인하는 항목입니다.",
    requiredDocs: [
      "보험계약 해약환급금 예상액 확인서(보험사 발급)",
      "보험증권 또는 가입내역서",
    ],
    procedure: [
      "가입한 모든 보험사 고객센터에 '해약환급금 예상액 증명'을 요청합니다.",
      "각 보험사에서 발급받은 확인서를 모두 취합합니다.",
      "보험이 없다면 신용정보원 보험가입조회로 '미가입'을 확인합니다.",
    ],
  },
  {
    category: "asset",
    keywords: ["임차", "보증금", "전세", "월세", "임대차"],
    summary:
      "거주 중인 집의 임차보증금(돌려받을 보증금)을 확인하기 위한 항목입니다.",
    requiredDocs: [
      "임대차계약서 사본",
      "(전입) 주민등록등본",
      "보증금 송금/지급 내역",
    ],
    procedure: [
      "현재 거주지 임대차계약서를 준비합니다.",
      "보증금을 실제로 지급한 이체내역을 함께 정리합니다.",
      "소액임차보증금 우선변제 한도 해당 여부를 담당자가 검토합니다.",
    ],
  },
  {
    category: "asset",
    keywords: ["퇴직금", "퇴직급여", "연금", "예금", "예적금", "잔액"],
    summary: "예금·퇴직금·연금 등 금융자산을 확인하기 위한 항목입니다.",
    requiredDocs: [
      "전 금융기관 예금 잔액증명서(기준일자 지정)",
      "(재직 중) 퇴직금 추계액 확인서",
    ],
    procedure: [
      "거래하는 모든 은행에서 기준일 잔액증명서를 발급받습니다.",
      "회사에 재직 중이면 퇴직금 추계액 확인서를 요청합니다.",
    ],
  },
  {
    category: "debt",
    keywords: ["채권자", "채권자목록", "누락", "채무", "대출", "원리금", "잔액", "불일치"],
    summary:
      "채권자목록의 누락·금액 오류를 바로잡기 위한 항목입니다. 빠진 채권자나 금액이 맞지 않는 부분을 정정해야 합니다.",
    requiredDocs: [
      "한국신용정보원 '신용정보 조회서'(전 금융권 채무)",
      "각 채권자별 부채증명서(원금·이자 구분)",
    ],
    procedure: [
      "신용정보원(또는 각 사 앱)에서 전체 채무 현황을 조회합니다.",
      "누락된 채권자를 채권자목록에 추가하고, 금액이 다른 항목은 부채증명서 기준으로 정정합니다.",
      "정정된 채권자목록을 담당자가 보정서와 함께 제출합니다.",
    ],
  },
  {
    category: "living",
    keywords: ["생계비", "생활비", "과다", "부양", "가족관계", "가구원"],
    summary:
      "신고한 생계비가 적정한지, 부양가족이 실제로 맞는지 확인·조정하는 항목입니다.",
    requiredDocs: [
      "가족관계증명서(상세)",
      "주민등록등본(세대원 확인)",
      "(부양 입증) 건강보험 피부양자 자료 등",
    ],
    procedure: [
      "가구원수를 기준 중위소득표에 맞게 다시 확인합니다.",
      "부양가족을 가족관계·주민등록으로 소명합니다.",
      "생계비 항목을 법원 인정 기준에 맞춰 조정한 뒤 재산정합니다.",
    ],
  },
  {
    category: "plan",
    keywords: ["변제계획", "가용소득", "변제율", "변제액", "최저변제", "수정"],
    summary:
      "변제계획안의 가용소득·변제액 산정을 다시 맞추라는 항목입니다.",
    requiredDocs: ["수정된 수입·지출목록", "수정 변제계획안"],
    procedure: [
      "확정된 소득·생계비로 월 가용소득을 다시 계산합니다.",
      "청산가치 보장 원칙(총변제액 ≥ 청산가치)을 충족하는지 확인합니다.",
      "수정 변제계획안을 작성해 제출합니다.",
    ],
  },
  {
    category: "liquidation",
    keywords: ["청산가치", "청산", "재산평가"],
    summary:
      "파산했을 때 채권자가 받을 수 있는 금액(청산가치)을 정확히 산정하라는 항목입니다. 총변제액이 이 금액 이상이어야 합니다.",
    requiredDocs: ["재산별 평가자료(부동산·차량·보험·예금 등)", "청산가치 산정표"],
    procedure: [
      "각 재산의 평가액과 면제재산을 반영해 청산가치를 산정합니다.",
      "총변제액이 청산가치 이상이 되도록 변제계획을 조정합니다.",
    ],
  },
  {
    category: "transfer",
    keywords: ["편파변제", "재산처분", "증여", "양도", "이체", "특정채권자", "사용처", "소명"],
    summary:
      "최근의 큰 금액 이체·처분·특정 채권자 우선변제 등에 대해 사용처와 경위를 소명하라는 항목입니다.",
    requiredDocs: [
      "해당 거래의 계좌 거래내역",
      "사용처 증빙(영수증·계약서 등)",
      "경위 설명서(사실확인서)",
    ],
    procedure: [
      "지적된 거래가 발생한 계좌 내역을 출력합니다.",
      "해당 자금의 사용처를 증빙과 함께 정리합니다.",
      "편파변제·부인대상이 아님을 설명하는 사실확인서를 작성합니다.",
    ],
  },
  {
    category: "service",
    keywords: ["송달", "주소", "송달불능", "보정", "채권자 주소", "공시송달"],
    summary:
      "일부 채권자에게 서류가 전달되지 않아(송달불능) 주소를 보정하라는 항목입니다.",
    requiredDocs: ["해당 채권자의 정확한 주소(법인등기 주소 등)", "(필요 시) 주소보정명령서"],
    procedure: [
      "송달불능 채권자의 법인등기 또는 최신 주소를 확인합니다.",
      "정정된 주소로 주소보정서를 제출합니다.",
      "필요한 경우 공시송달을 신청합니다.",
    ],
  },
  {
    category: "document",
    keywords: ["누락", "미제출", "추가제출", "보완", "첨부", "서류"],
    summary: "신청 시 빠진 서류를 추가로 제출하라는 항목입니다.",
    requiredDocs: ["보정명령에 적시된 누락 서류"],
    procedure: [
      "보정명령서에 적힌 누락 서류 목록을 확인합니다.",
      "각 서류를 발급/준비하여 담당자에게 전달합니다.",
    ],
  },
];

const GENERIC: Omit<Rule, "keywords"> = {
  category: "etc",
  summary: "법원이 추가 소명·보완을 요구한 항목입니다. 담당자가 내용을 확인해 안내드립니다.",
  requiredDocs: ["담당자 확인 후 안내"],
  procedure: ["담당자가 항목을 검토한 뒤 필요한 서류와 절차를 안내합니다."],
};

function classifyLine(line: string): Rule | typeof GENERIC {
  const text = line.replace(/\s+/g, "");
  let best: Rule | null = null;
  let bestScore = 0;
  for (const rule of CORRECTION_RULES) {
    const score = rule.keywords.reduce(
      (s, k) => (text.includes(k.replace(/\s+/g, "")) ? s + 1 : s),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }
  return best ?? { ...GENERIC, keywords: [] };
}

// 말미(closing) 라인 — 보정사항 본문 시작과 충돌하지 않는 패턴만.
const FOOTER = [
  /^보\s*정\s*(명령|권고|사항)?\s*$/, // "보정명령" 제목
  /^주\s*문\s*$/,
  /^위\s*보정/, // "위 보정사항을 ..."
  /송달\s*받은?\s*날/, // "송달받은 날부터 N일..."
  /보정하(시기|여|기)\s*바랍/, // "보정하시기 바랍니다"
  /귀\s*중\s*$/,
  /^\d{4}\s*[.\-]\s*\d{1,2}\s*[.\-]\s*\d{1,2}\.?\s*$/, // 날짜만 있는 줄
];
const isFooter = (s: string) => FOOTER.some((re) => re.test(s.replace(/\s+/g, " ").trim()));

// 번호 없는 경우의 짧은 머리말(사건/신청인/채무자 + 짧은 값) 판별.
const isShortHeader = (s: string) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length < 28 && /^[([]?\s*(사\s*건|신\s*청\s*인|채\s*무\s*자)\b/.test(t.replace(/\s/g, ""));
};

// 보정명령 원문을 '실제 보정사항' 단위로 분해.
// 1) 줄 단위로 말미(closing) 제거 → 2) 번호가 있으면 그 단위로 분해하고 머리말(첫 조각)은 버린다.
export function splitCorrectionLines(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !isFooter(l));

  const joined = lines.join("\n");
  const markerRe = /(?:^|\n)\s*(?:\d{1,2}[.)]|[가-하][.)]|[①-⑮]|[-•·▪])\s+/g;
  const markerCount = (joined.match(markerRe) || []).length;

  let parts: string[];
  if (markerCount >= 2) {
    // 첫 조각(첫 번호 이전의 머리말/제목)은 제거
    parts = joined.split(markerRe).slice(1);
  } else {
    parts = lines.filter((l) => !isShortHeader(l));
  }

  return parts.map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length > 5);
}

let uid = 0;
const nid = () => `ci_${Date.now().toString(36)}_${uid++}`;

// 규칙기반 보정 항목 생성(폴백)
export function parseCorrectionRuleBased(raw: string): CorrectionItem[] {
  const lines = splitCorrectionLines(raw);
  const segments = lines.length ? lines : [raw.trim()];
  return segments.map((line) => {
    const rule = classifyLine(line);
    return {
      id: nid(),
      category: rule.category,
      originalText: line,
      summary: rule.summary,
      requiredDocs: rule.requiredDocs,
      procedure: rule.procedure,
      clientNote: buildClientNote(rule.category),
      done: false,
    };
  });
}

function buildClientNote(cat: CorrectionItemCategory): string {
  const map: Record<CorrectionItemCategory, string> = {
    income: "소득 관련 서류는 발급에 1~2일 걸릴 수 있으니 미리 준비 부탁드립니다.",
    asset: "재산 관련 서류는 보유/미보유 모두 '증명'이 필요합니다. 없으면 '없다는 증명'을 발급합니다.",
    debt: "채무 금액은 부채증명서 기준으로 맞추니, 모든 채권자 부채증명서를 받아주세요.",
    living: "부양가족 입증이 핵심입니다. 가족관계·주민등록 서류를 준비해 주세요.",
    plan: "이 항목은 사무소에서 계산을 다시 맞춰 처리합니다. 추가 자료만 주시면 됩니다.",
    liquidation: "사무소에서 재산평가를 반영해 산정합니다. 재산 관련 자료를 주세요.",
    transfer: "지적된 거래의 '사용처'가 핵심입니다. 어디에 썼는지 증빙을 모아주세요.",
    service: "채권자 주소 문제로, 사무소에서 주소를 확인해 처리합니다.",
    document: "빠진 서류만 추가로 주시면 됩니다.",
    etc: "담당자가 확인 후 구체적으로 안내드리겠습니다.",
  };
  return map[cat];
}

// ── 공유 메시지 생성 ────────────────────────────────────────────────

export function buildClientGuideText(opts: {
  clientName: string;
  court: string;
  dueAt: string;
  items: CorrectionItem[];
  firmName: string;
}): string {
  const { clientName, court, dueAt, items, firmName } = opts;
  const dueStr = formatK(dueAt);
  const lines: string[] = [];
  lines.push(`[${firmName}] ${clientName}님, 보정명령 안내드립니다.`);
  lines.push("");
  lines.push(`${court}에서 보정명령이 도착했습니다. 아래 내용을 ${dueStr}까지 준비해 주세요.`);
  lines.push("");
  items.forEach((it, i) => {
    lines.push(`■ ${i + 1}. ${it.summary ?? ""}`);
    if (it.requiredDocs?.length) {
      lines.push(`   · 필요서류: ${it.requiredDocs.join(", ")}`);
    }
    if (it.clientNote) lines.push(`   · 참고: ${it.clientNote}`);
    lines.push("");
  });
  lines.push("준비되는 대로 사진/스캔으로 보내주시면 사무소에서 정리해 법원에 제출합니다.");
  lines.push(`문의: ${firmName}`);
  return lines.join("\n");
}

export function buildEmailSubject(clientName: string, court: string) {
  return `[보정명령 안내] ${clientName}님 — ${court} 제출 준비 안내`;
}

function formatK(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
