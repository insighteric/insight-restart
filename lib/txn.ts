// 거래내역 분석 엔진 (클라이언트, 규칙기반)
// law-bot.kr 거래내역서 분석 기능을 반영:
//  자동추출(거래상대방 포함) · 기준금액 필터(은행/카드) · 엑셀 시트(전체/입금/출금/원본)
//  특정인 거래 추출(부분일치) · 본인계좌 자동 매칭 · 증권/코인 대조
//  대출금 사용처 소명표 · 마이너스 통장 추적 · 카드 현금서비스 탐지

export type StmtSource = "bank" | "card" | "invest";

export interface Txn {
  date: string; // YYYY-MM-DD
  amount: number; // +입금 / -출금
  desc: string; // 거래내용/적요
  counterpart: string; // 거래상대방
  source: StmtSource;
  purpose?: string; // 본인계좌 이체 / 증권·코인 이체 등 자동 표시
}

export interface AnalyzeOptions {
  clientName: string;
  bankThreshold: number; // 0이면 전체
  cardThreshold: number;
  targetName?: string; // 특정인 거래 추출
  loan?: { date: string; amount: number }; // 대출금 사용처 소명
  overdraft?: { startDate: string; limit: number }; // 마이너스 통장 추적
}

const num = (s: string) => Number(String(s ?? "").replace(/[^0-9.-]/g, "")) || 0;
const isDate = (s: string) => /\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}|\d{1,2}[.\-/]\d{1,2}/.test(s);
const findIdx = (cols: string[], re: RegExp) => cols.findIndex((c) => re.test(c));

function stripThousands(s: string): string {
  let prev: string;
  let cur = s;
  do {
    prev = cur;
    cur = cur.replace(/(\d),(\d{3})(?=\D|$)/g, "$1$2");
  } while (cur !== prev);
  return cur;
}

function normDate(s: string): string {
  const m = String(s).match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const m2 = String(s).match(/(\d{1,2})[.\-/](\d{1,2})/);
  if (m2) return `2025-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  return s;
}

// 증권/코인: 실제 원화 입출금만, 매매/배당/수수료 제외
const INVEST_KEEP = /이체입금|이체출금|입금|출금|원화|가상자산\s*구매|krw/i;
const INVEST_DROP = /매수|매도|체결|배당|수수료|예수금이자|주식|이자지급|보유/;

// 카드 현금서비스(단기카드대출) 탐지
export const CASH_ADVANCE = /현금서비스|단기카드대출|카드론|장기카드대출/;

// 한 종류(은행/카드/증권)의 텍스트를 파싱.
export function parseStatement(rawInput: string, source: StmtSource): Txn[] {
  const raw = stripThousands(rawInput || "");
  const rows = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!rows.length) return [];

  const sample = rows[0];
  const delim = sample.includes("\t") ? /\t/ : sample.includes(",") ? /,/ : /\s{2,}|\|/;
  const split = (l: string) => l.split(delim).map((c) => c.trim());

  const headerRow = rows.find(
    (r) => /적요|내용|날짜|일자|출금|입금|잔액|거래|상대|가맹|구분/i.test(r) && !isDate(r),
  );
  let idx = { date: -1, desc: -1, cp: -1, out: -1, in: -1, amt: -1, bal: -1 };
  if (headerRow) {
    const h = split(headerRow);
    idx = {
      date: findIdx(h, /날짜|일자|거래일|승인일|date/i),
      desc: findIdx(h, /적요|이용내역|거래내용|내용|비고|구분|메모/),
      cp: findIdx(h, /거래상대|상대방|받는|보낸|수취인|의뢰인|입금자|가맹점/),
      out: findIdx(h, /출금|지급|차변|이용금액|승인금액|찾으신/),
      in: findIdx(h, /입금|받은|대변|맡기신/),
      amt: findIdx(h, /^금액$|거래금액/),
      bal: findIdx(h, /잔액|잔고|balance/i),
    };
  }

  const out: Txn[] = [];
  for (const line of rows) {
    if (headerRow && line === headerRow) continue;
    const cells = split(line);
    if (cells.length < 2 || !cells.some(isDate)) continue;

    const date = normDate(idx.date >= 0 ? cells[idx.date] : cells.find(isDate) ?? cells[0]);
    let amount = 0;

    if (headerRow && (idx.in >= 0 || idx.out >= 0)) {
      const inAmt = idx.in >= 0 ? num(cells[idx.in]) : 0;
      const outAmt = idx.out >= 0 ? num(cells[idx.out]) : 0;
      amount = inAmt > 0 ? inAmt : -Math.abs(outAmt);
    } else if (headerRow && idx.amt >= 0) {
      amount = num(cells[idx.amt]);
      if (/출금|결제|지급|이용|승인|상환|인출/.test(line) && amount > 0) amount = -amount;
    } else {
      const nums = cells.map((c) => num(c)).filter((v) => Math.abs(v) >= 100);
      if (!nums.length) continue;
      amount = Math.abs(nums.length >= 2 ? nums[nums.length - 2] : nums[0]);
      if (/입금|이체입|급여|월급|수당|상여|연금|맡기/.test(line)) amount = Math.abs(amount);
      else amount = -Math.abs(amount);
    }
    if (amount === 0) continue;

    const cp = idx.cp >= 0 ? cells[idx.cp] : "";
    const desc = idx.desc >= 0 ? cells[idx.desc] : cells.find((c) => !isDate(c) && num(c) === 0) ?? "";
    const counterpart = (cp || desc || "").slice(0, 30);

    // 증권/코인: 실제 원화 입출금만
    if (source === "invest") {
      const hay = `${desc} ${counterpart}`;
      if (INVEST_DROP.test(hay) && !INVEST_KEEP.test(hay)) continue;
    }

    out.push({ date, amount, desc: (desc || counterpart || "거래").slice(0, 40), counterpart, source });
  }
  return out;
}

const partialMatch = (text: string, name: string) => {
  const t = (text || "").replace(/\s+/g, "");
  const n = (name || "").replace(/\s+/g, "");
  return n.length > 0 && t.includes(n);
};

export interface SheetRow {
  date: string;
  type: "입금" | "출금";
  amount: number;
  counterpart: string;
  desc: string;
  purpose?: string;
  source: StmtSource;
}

export interface LoanTrace {
  loanDate: string;
  loanAmount: number;
  depositMatched: boolean;
  uses: { date: string; amount: number; counterpart: string; toOtherAccount: boolean }[];
  tracedTotal: number;
  remaining: number;
}

export interface OverdraftTrace {
  startDate: string;
  limit: number;
  reachedDate: string | null;
  steps: { date: string; amount: number; cumulative: number; counterpart: string }[];
}

export interface Flag {
  level: "high" | "mid";
  txn: Txn;
  reason: string;
}

export interface AnalysisResult {
  count: number;
  periodFrom: string;
  periodTo: string;
  totalIn: number;
  totalOut: number;
  selfTransferCount: number; // 본인계좌 이체 건수
  selfTransferAmount: number;
  monthlyIncomeEstimate: number;
  incomeMonths: number;
  thresholdRows: SheetRow[]; // 기준금액 이상 (입출금 전체)
  depositRows: SheetRow[]; // 입금 시트
  withdrawalRows: SheetRow[]; // 출금 시트
  allRows: SheetRow[]; // 원본 전체
  targetRows: SheetRow[]; // 특정인 대조표
  cashAdvances: SheetRow[]; // 카드 현금서비스
  crossAccount: SheetRow[]; // 은행→증권/코인 유출
  loan?: LoanTrace;
  overdraft?: OverdraftTrace;
  flags: Flag[];
  categories: { label: string; out: number; count: number }[];
}

const toRow = (t: Txn): SheetRow => ({
  date: t.date,
  type: t.amount >= 0 ? "입금" : "출금",
  amount: Math.abs(t.amount),
  counterpart: t.counterpart,
  desc: t.desc,
  purpose: t.purpose,
  source: t.source,
});

const INCOME_KW = /급여|월급|상여|수당|임금|용역|보수|연금/;
const GAMBLE_KW = /토토|배팅|벳|카지노|환전|코인|업비트|빗썸|바이낸스|복권|슬롯/;
const LOAN_KW = /대출|론|캐피탈|저축은행|상환|선이자/;
const CARD_KW = /카드|신용|체크/;
const CASH_KW = /현금|atm|인출|cd출금/i;

export function analyze(txns: Txn[], opts: AnalyzeOptions): AnalysisResult {
  // 본인계좌 자동 매칭: 거래상대방에 의뢰인 이름이 포함되면 본인 이체로 표시
  const tagged = txns.map((t) => {
    let purpose = t.purpose;
    if (opts.clientName && partialMatch(t.counterpart, opts.clientName)) purpose = "본인계좌 이체";
    if (t.source === "invest") purpose = purpose ?? "증권·코인 이체";
    return { ...t, purpose };
  });

  const sorted = [...tagged].sort((a, b) => a.date.localeCompare(b.date));
  const ins = sorted.filter((t) => t.amount > 0);
  const outs = sorted.filter((t) => t.amount < 0);
  const totalIn = ins.reduce((s, t) => s + t.amount, 0);
  const totalOut = outs.reduce((s, t) => s + Math.abs(t.amount), 0);

  const self = sorted.filter((t) => t.purpose === "본인계좌 이체");
  const selfTransferAmount = self.reduce((s, t) => s + Math.abs(t.amount), 0);

  // 소득 추정 — 본인이체 제외, 급여성 입금 우선
  const realIns = ins.filter((t) => t.purpose !== "본인계좌 이체");
  const incomeTxns = realIns.filter((t) => INCOME_KW.test(`${t.desc} ${t.counterpart}`));
  const incomeBase = incomeTxns.length ? incomeTxns : realIns;
  const months = new Set(incomeBase.map((t) => t.date.slice(0, 7)));
  const incomeMonths = Math.max(1, months.size);
  const monthlyIncomeEstimate = Math.round(
    incomeBase.reduce((s, t) => s + t.amount, 0) / incomeMonths,
  );

  // 기준금액 필터 (은행/카드 별도, 본인이체 제외)
  const passThreshold = (t: Txn) => {
    const th = t.source === "card" ? opts.cardThreshold : opts.bankThreshold;
    return Math.abs(t.amount) >= (th || 0);
  };
  const thresholdTxns = sorted.filter((t) => t.purpose !== "본인계좌 이체" && passThreshold(t));

  // 특정인 거래 추출 (부분일치)
  const targetTxns = opts.targetName
    ? sorted.filter(
        (t) =>
          partialMatch(t.counterpart, opts.targetName!) || partialMatch(t.desc, opts.targetName!),
      )
    : [];

  // 카드 현금서비스
  const cashAdvances = sorted.filter((t) => CASH_ADVANCE.test(`${t.desc} ${t.counterpart}`));

  // 은행 → 증권/코인 유출 (은행 출금 중 상대방이 증권/코인)
  const crossAccount = sorted.filter(
    (t) => t.source === "bank" && t.amount < 0 && GAMBLE_KW.test(`${t.desc} ${t.counterpart}`),
  );

  // 대출금 사용처 소명
  let loan: LoanTrace | undefined;
  if (opts.loan && opts.loan.amount > 0) {
    const ld = opts.loan.date;
    const deposit = ins.find((t) => t.date >= ld && Math.abs(t.amount - opts.loan!.amount) < opts.loan!.amount * 0.1);
    const after = outs.filter((t) => t.date >= ld).sort((a, b) => a.date.localeCompare(b.date));
    const uses: LoanTrace["uses"] = [];
    let acc = 0;
    for (const t of after) {
      if (acc >= opts.loan.amount) break;
      const amt = Math.abs(t.amount);
      uses.push({
        date: t.date,
        amount: amt,
        counterpart: t.counterpart || t.desc,
        toOtherAccount: GAMBLE_KW.test(`${t.desc} ${t.counterpart}`) || LOAN_KW.test(`${t.desc} ${t.counterpart}`),
      });
      acc += amt;
    }
    loan = {
      loanDate: ld,
      loanAmount: opts.loan.amount,
      depositMatched: !!deposit,
      uses,
      tracedTotal: Math.min(acc, opts.loan.amount),
      remaining: Math.max(0, opts.loan.amount - acc),
    };
  }

  // 마이너스 통장 추적
  let overdraft: OverdraftTrace | undefined;
  if (opts.overdraft && opts.overdraft.limit > 0) {
    const sd = opts.overdraft.startDate;
    const after = outs.filter((t) => t.date >= sd).sort((a, b) => a.date.localeCompare(b.date));
    const steps: OverdraftTrace["steps"] = [];
    let cum = 0;
    let reachedDate: string | null = null;
    for (const t of after) {
      cum += Math.abs(t.amount);
      steps.push({ date: t.date, amount: Math.abs(t.amount), cumulative: cum, counterpart: t.counterpart || t.desc });
      if (cum >= opts.overdraft.limit) {
        reachedDate = t.date;
        break;
      }
    }
    overdraft = { startDate: sd, limit: opts.overdraft.limit, reachedDate, steps };
  }

  // 위험 플래그 (회생ON 부가가치)
  const flags: Flag[] = [];
  for (const t of sorted) {
    if (t.purpose === "본인계좌 이체") continue;
    const a = Math.abs(t.amount);
    const hay = `${t.desc} ${t.counterpart}`;
    if (GAMBLE_KW.test(hay)) flags.push({ level: "high", txn: t, reason: "도박·투기성 거래 의심 (재산은닉/낭비 쟁점)" });
    else if (CASH_ADVANCE.test(hay)) flags.push({ level: "mid", txn: t, reason: "카드 현금서비스(단기카드대출)" });
    else if (t.amount < 0 && LOAN_KW.test(hay) && a >= 1_000_000) flags.push({ level: "mid", txn: t, reason: "특정 채권자 상환 의심 (편파변제 검토)" });
    else if (t.amount < 0 && CASH_KW.test(hay) && a >= 2_000_000) flags.push({ level: "mid", txn: t, reason: "고액 현금인출 (사용처 소명 필요)" });
  }

  // 지출 카테고리
  const catMap: Record<string, { out: number; count: number }> = {};
  const add = (label: string, amt: number) => {
    catMap[label] ??= { out: 0, count: 0 };
    catMap[label].out += amt;
    catMap[label].count += 1;
  };
  for (const t of outs) {
    if (t.purpose === "본인계좌 이체") continue;
    const a = Math.abs(t.amount);
    const hay = `${t.desc} ${t.counterpart}`;
    if (CASH_ADVANCE.test(hay)) add("현금서비스", a);
    else if (CARD_KW.test(hay)) add("카드대금", a);
    else if (LOAN_KW.test(hay)) add("대출상환", a);
    else if (CASH_KW.test(hay)) add("현금인출", a);
    else if (GAMBLE_KW.test(hay)) add("투기성", a);
    else add("기타지출", a);
  }
  const categories = Object.entries(catMap)
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.out - a.out);

  return {
    count: sorted.length,
    periodFrom: sorted[0]?.date ?? "",
    periodTo: sorted[sorted.length - 1]?.date ?? "",
    totalIn,
    totalOut,
    selfTransferCount: self.length,
    selfTransferAmount,
    monthlyIncomeEstimate,
    incomeMonths,
    thresholdRows: thresholdTxns.map(toRow),
    depositRows: thresholdTxns.filter((t) => t.amount > 0).map(toRow),
    withdrawalRows: thresholdTxns.filter((t) => t.amount < 0).map(toRow),
    allRows: sorted.map(toRow),
    targetRows: targetTxns.map(toRow),
    cashAdvances: cashAdvances.map(toRow),
    crossAccount: crossAccount.map(toRow),
    loan,
    overdraft,
    flags: flags.sort((a) => (a.level === "high" ? -1 : 1)),
    categories,
  };
}

// CSV(엑셀 호환, BOM 포함) 생성 + 다운로드
export function rowsToCsv(rows: SheetRow[]): string {
  const head = ["날짜", "구분", "금액", "거래상대방", "거래내용", "거래목적", "출처"];
  const body = rows.map((r) =>
    [r.date, r.type, r.amount, r.counterpart, r.desc, r.purpose ?? "", srcLabel(r.source)]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  return "﻿" + [head.join(","), ...body].join("\n");
}

export function srcLabel(s: StmtSource) {
  return s === "bank" ? "은행" : s === "card" ? "카드" : "증권·코인";
}

export const SAMPLE_BANK = `날짜,거래상대방,적요,출금,입금,잔액
2025-09-25,(주)한국물류,급여,,3600000,3820000
2025-09-26,신한카드,카드결제,850000,,2970000
2025-09-28,OK저축은행,대출상환,1200000,,1770000
2025-10-02,김민수,본인이체(증권),2000000,,
2025-10-05,ATM,현금인출,3000000,,
2025-10-10,업비트,가상자산구매,2000000,,800000
2025-10-18,이모(이정자),송금,1500000,,
2025-10-25,(주)한국물류,급여,,3600000,4100000
2025-11-03,토토사이트,환전,1500000,,2600000
2025-11-25,(주)한국물류,급여,,3600000,6200000`;

export const SAMPLE_CARD = `승인일,가맹점명,이용내역,이용금액
2025-09-20,쿠팡,온라인쇼핑,180000
2025-10-01,신한카드,현금서비스,1000000
2025-10-12,이마트,생활,95000
2025-11-02,주유소,교통,70000`;

export const SAMPLE_INVEST = `날짜,구분,거래내용,출금,입금
2025-10-02,이체입금,원화입금,,2000000
2025-10-03,매수,삼성전자 10주,700000,
2025-10-20,이체출금,원화출금,500000,`;
