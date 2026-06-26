"use client";

import { useRef, useState } from "react";
import {
  ReceiptText,
  Wand2,
  AlertTriangle,
  Download,
  Landmark,
  CreditCard,
  LineChart,
  UserSearch,
  HandCoins,
  Info,
  FileUp,
  Loader2,
  Highlighter,
} from "lucide-react";
import { extractText, highlightPdf, pdfToImageDataUrls, downloadBytes } from "@/lib/pdf";
import { ocrImage, ocrImages } from "@/lib/ocr";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Button, Badge, Stat, Field, EmptyState } from "@/components/ui";
import { won, manwon, formatDate } from "@/lib/format";
import {
  parseStatement,
  analyze,
  rowsToCsv,
  srcLabel,
  SAMPLE_BANK,
  SAMPLE_CARD,
  SAMPLE_INVEST,
  type AnalysisResult,
  type SheetRow,
  type StmtSource,
  type AnalyzeOptions,
} from "@/lib/txn";

const THRESHOLDS = [0, 300000, 500000, 1000000, 2000000, 3000000];
const thLabel = (n: number) => (n === 0 ? "전체" : `${n / 10000}만`);

const MAX_VISION_PAGES = 24;

// 스캔본: Claude 비전으로 거래내역을 CSV로 추출(4페이지씩 배치, Vercel 요청 한계 대응).
// AI 미설정(400)이면 null 반환 → 호출부에서 tesseract 폴백.
async function extractViaVision(
  images: string[],
  source: StmtSource,
  onMsg: (m: string) => void,
): Promise<string | null> {
  const header = source === "card" ? "승인일,가맹점명,이용내역,이용금액" : "날짜,거래상대방,적요,출금,입금";
  const BATCH = 4;
  const rows: string[] = [];
  let aiOff = false;
  for (let i = 0; i < images.length; i += BATCH) {
    const chunk = images.slice(i, i + BATCH);
    onMsg(`AI로 거래내역 추출 중… ${Math.min(i + BATCH, images.length)}/${images.length}페이지`);
    try {
      const res = await fetch("/api/ai/statement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ images: chunk, source }),
      });
      const j = await res.json();
      if (res.status === 400) { aiOff = true; break; }
      if (res.ok && typeof j.rows === "string" && j.rows.trim()) rows.push(j.rows.trim());
    } catch {
      // 네트워크 오류 → 폴백
      return null;
    }
  }
  if (aiOff || !rows.length) return null;
  return header + "\n" + rows.join("\n");
}

type ColorMode = "split" | "unified";

export default function AnalyzePage() {
  const [client, setClient] = useState("");
  const [tab, setTab] = useState<StmtSource>("bank");
  const [bank, setBank] = useState("");
  const [card, setCard] = useState("");
  const [invest, setInvest] = useState("");
  const [bankTh, setBankTh] = useState(0);
  const [cardTh, setCardTh] = useState(0);
  const [target, setTarget] = useState("");
  const [loanDate, setLoanDate] = useState("");
  const [loanAmt, setLoanAmt] = useState("");
  const [odStart, setOdStart] = useState("");
  const [odLimit, setOdLimit] = useState("");
  const [colorMode, setColorMode] = useState<ColorMode>("split");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resTab, setResTab] = useState("요약");
  const [pdfFiles, setPdfFiles] = useState<Partial<Record<StmtSource, File>>>({});
  const [extracting, setExtracting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = () => {
    const txns = [
      ...parseStatement(bank, "bank"),
      ...parseStatement(card, "card"),
      ...parseStatement(invest, "invest"),
    ];
    const opts: AnalyzeOptions = {
      clientName: client.trim(),
      bankThreshold: bankTh,
      cardThreshold: cardTh,
      targetName: target.trim() || undefined,
      loan: loanDate && Number(loanAmt) ? { date: loanDate, amount: Number(loanAmt.replace(/[^0-9]/g, "")) } : undefined,
      overdraft: odStart && Number(odLimit) ? { startDate: odStart, limit: Number(odLimit.replace(/[^0-9]/g, "")) } : undefined,
    };
    setResult(analyze(txns, opts));
    setResTab("요약");
  };

  const loadSample = () => {
    setClient("김민수");
    setBank(SAMPLE_BANK);
    setCard(SAMPLE_CARD);
    setInvest(SAMPLE_INVEST);
    setBankTh(1000000);
    setCardTh(500000);
    setTarget("이정자");
    setLoanDate("2025-09-28");
    setLoanAmt("15000000");
  };

  const setterFor = (s: StmtSource) => (s === "bank" ? setBank : s === "card" ? setCard : setInvest);
  const textFor = (s: StmtSource) => (s === "bank" ? bank : s === "card" ? card : invest);

  const extractFromFile = async (file: File, source: StmtSource) => {
    setExtracting(`${srcLabel(source)} 추출 중…`);
    try {
      let text = "";
      const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);
      if (isPdf) {
        text = await extractText(file);
        if (text.replace(/\s/g, "").length < 20) {
          // 스캔본(이미지) PDF → 페이지를 이미지로 렌더 후 AI 비전 추출(실패 시 OCR 폴백)
          setExtracting("스캔본 감지 — 페이지 렌더링 중…");
          let imgs = await pdfToImageDataUrls(file, 1.7, "image/jpeg", 0.7);
          if (imgs.length > MAX_VISION_PAGES) {
            imgs = imgs.slice(0, MAX_VISION_PAGES);
            setExtracting(`페이지가 많아 앞 ${MAX_VISION_PAGES}장만 처리합니다…`);
          }
          const aiCsv = await extractViaVision(imgs, source, (m) => setExtracting(m));
          if (aiCsv && aiCsv.split("\n").length > 1) {
            text = aiCsv;
          } else {
            setExtracting("AI 추출 불가 → 문자 인식(OCR) 중… (수십 초 소요)");
            text = await ocrImages(imgs, (p, t) => setExtracting(`OCR ${p}/${t}페이지…`));
          }
        }
        setPdfFiles((prev) => ({ ...prev, [source]: file }));
      } else {
        setExtracting("이미지 OCR 중… (수십 초 소요될 수 있어요)");
        text = await ocrImage(file);
      }
      const cur = textFor(source);
      setterFor(source)((cur ? cur + "\n" : "") + text.trim());
    } catch (e) {
      alert("추출에 실패했습니다. 파일을 확인해주세요.");
      console.error(e);
    } finally {
      setExtracting(null);
    }
  };

  const downloadHighlight = async (source: StmtSource) => {
    const file = pdfFiles[source];
    if (!file) return;
    const th = source === "card" ? cardTh : bankTh;
    setExtracting("하이라이트 PDF 생성 중…");
    try {
      const bytes = await highlightPdf(
        file,
        (line) => {
          const nums = (line.replace(/(\d),(\d{3})/g, "$1$2").match(/\d{4,}/g) || []).map(Number);
          const max = Math.max(0, ...nums);
          if (max < (th || 1)) return null;
          return /입금|맡기/.test(line) ? "in" : "out";
        },
        colorMode,
      );
      downloadBytes(bytes, file.name.replace(/\.pdf$/i, "") + "_하이라이트.pdf");
    } catch (e) {
      alert("하이라이트 생성 실패");
      console.error(e);
    } finally {
      setExtracting(null);
    }
  };

  const tabs: { key: StmtSource; label: string; icon: React.ElementType; v: string; set: (s: string) => void; sample: string }[] = [
    { key: "bank", label: "은행", icon: Landmark, v: bank, set: setBank, sample: SAMPLE_BANK },
    { key: "card", label: "카드", icon: CreditCard, v: card, set: setCard, sample: SAMPLE_CARD },
    { key: "invest", label: "증권·코인", icon: LineChart, v: invest, set: setInvest, sample: SAMPLE_INVEST },
  ];
  const active = tabs.find((t) => t.key === tab)!;

  const download = (rows: SheetRow[], name: string) => {
    const blob = new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resultTabs = result
    ? [
        "요약",
        "입출금 전체",
        "입금",
        "출금",
        "원본",
        ...(result.targetRows.length ? ["특정인 대조표"] : []),
        ...(result.loan ? ["대출금 소명표"] : []),
        ...(result.overdraft ? ["마이너스 통장"] : []),
        "AI 인사이트",
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="거래내역 분석"
        desc="은행·카드·증권/코인 거래내역으로 기준금액 추출·본인계좌 매칭·특정인 거래·대출금 소명·마이너스 통장 추적까지 자동 처리합니다."
        action={<Badge tone="brand">v3 · 소명자료 생성</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* 입력 */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="1. 거래내역 입력" desc="은행/카드/증권·코인 표를 붙여넣으세요." />
            <div className="space-y-3 p-5">
              <Field label="의뢰인 이름" hint="거래상대방에 찍힌 본인 이름으로 본인계좌 간 송금을 매칭합니다.">
                <input
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="예: 김민수"
                  className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
              </Field>

              <div className="flex gap-1 rounded-lg border border-line bg-surface-2 p-1">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const filled = t.v.trim().length > 0;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors ${
                        tab === t.key ? "bg-surface text-brand-700 shadow-[var(--shadow-card)]" : "text-muted hover:text-ink"
                      }`}
                    >
                      <Icon size={14} /> {t.label}
                      {filled && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                    </button>
                  );
                })}
              </div>

              <textarea
                value={active.v}
                onChange={(e) => active.set(e.target.value)}
                rows={9}
                placeholder={`${active.label} 거래내역을 붙여넣으세요 (날짜, 거래상대방, 출금, 입금 …)`}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-[11.5px] leading-relaxed outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
              <div className="flex items-center justify-between">
                <button onClick={() => active.set(active.sample)} className="text-[13px] font-medium text-brand hover:underline">
                  {active.label} 예시
                </button>
                <button onClick={loadSample} className="text-[13px] font-medium text-muted hover:text-ink hover:underline">
                  전체 예시 불러오기
                </button>
              </div>

              <div className="rounded-lg border border-dashed border-line bg-surface-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[12.5px] text-muted">
                    <FileUp size={15} className="text-brand" />
                    PDF·이미지에서 자동 추출 (스캔본은 OCR)
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!!extracting}
                    onClick={() => fileRef.current?.click()}
                  >
                    {extracting ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                    파일 선택
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) extractFromFile(f, tab);
                      e.target.value = "";
                    }}
                  />
                </div>
                {extracting && <div className="mt-2 text-[12px] font-medium text-brand">{extracting}</div>}
                {pdfFiles[tab] && (
                  <button
                    onClick={() => downloadHighlight(tab)}
                    className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
                  >
                    <Highlighter size={14} /> 기준금액 하이라이트 PDF 다운로드
                  </button>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="2. 기준금액 필터" desc="이상 거래만 추출 (은행·카드 따로)" />
            <div className="space-y-3 p-5">
              <ThresholdPicker label="🏦 은행" value={bankTh} onChange={setBankTh} />
              <ThresholdPicker label="💳 카드" value={cardTh} onChange={setCardTh} />
            </div>
          </Card>

          <Card>
            <CardHeader title="3. 분석 모드 (선택)" />
            <div className="space-y-4 p-5">
              <Field label="특정인 거래 추출" hint="부분일치 — '이정자' 입력 시 '토스 이정자'도 추출">
                <div className="relative">
                  <UserSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="거래상대방 이름"
                    className="h-9.5 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </Field>
              <Field label="대출금 사용처 소명 (대출일 + 금액)">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} className="h-9.5 w-full rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
                  <input value={loanAmt} onChange={(e) => setLoanAmt(e.target.value)} placeholder="대출금액" inputMode="numeric" className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
                </div>
              </Field>
              <Field label="마이너스 통장 추적 (시작일 + 한도)">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={odStart} onChange={(e) => setOdStart(e.target.value)} className="h-9.5 w-full rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
                  <input value={odLimit} onChange={(e) => setOdLimit(e.target.value)} placeholder="한도금액" inputMode="numeric" className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
                </div>
              </Field>
              <Field label="하이라이트 색상 모드">
                <div className="flex gap-2">
                  <button onClick={() => setColorMode("split")} className={`flex-1 rounded-lg border py-2 text-[13px] font-medium ${colorMode === "split" ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted"}`}>
                    분리 (출금<span className="text-danger">빨강</span>/입금<span className="text-info">파랑</span>)
                  </button>
                  <button onClick={() => setColorMode("unified")} className={`flex-1 rounded-lg border py-2 text-[13px] font-medium ${colorMode === "unified" ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted"}`}>
                    통합 (노랑)
                  </button>
                </div>
              </Field>

              <Button className="w-full" onClick={run} disabled={!bank.trim() && !card.trim() && !invest.trim()}>
                <Wand2 size={16} /> 분석 시작
              </Button>
            </div>
          </Card>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-3">
          {!result ? (
            <Card>
              <EmptyState
                icon={<ReceiptText size={32} />}
                title="분석 결과가 여기에 표시됩니다"
                desc="거래내역을 붙여넣고 분석을 시작하세요. 기준금액 추출·본인계좌 매칭·소명표가 자동 생성됩니다."
                action={<Button variant="secondary" onClick={loadSample}>전체 예시로 체험</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1">
                {resultTabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setResTab(t)}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${resTab === t ? "bg-brand-50 text-brand-700" : "text-muted hover:text-ink"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {resTab === "요약" && <Summary result={result} />}
              {resTab === "입출금 전체" && <Sheet title="입출금 전체 (기준금액 이상)" rows={result.thresholdRows} onDownload={() => download(result.thresholdRows, "입출금_전체")} colorMode={colorMode} />}
              {resTab === "입금" && <Sheet title="입금 내역" rows={result.depositRows} onDownload={() => download(result.depositRows, "입금내역")} colorMode={colorMode} />}
              {resTab === "출금" && <Sheet title="출금 내역" rows={result.withdrawalRows} onDownload={() => download(result.withdrawalRows, "출금내역")} colorMode={colorMode} />}
              {resTab === "원본" && <Sheet title="원본 거래내역 (필터 없음)" rows={result.allRows} onDownload={() => download(result.allRows, "원본거래내역")} colorMode={colorMode} />}
              {resTab === "특정인 대조표" && <Sheet title={`특정인 대조표 — "${target}"`} rows={result.targetRows} onDownload={() => download(result.targetRows, `특정인_${target}`)} colorMode={colorMode} />}
              {resTab === "대출금 소명표" && result.loan && <LoanSheet result={result} />}
              {resTab === "마이너스 통장" && result.overdraft && <OverdraftSheet result={result} />}
              {resTab === "AI 인사이트" && <Insights result={result} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThresholdPicker({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-[13px] font-medium text-ink-soft">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {THRESHOLDS.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`rounded-md border px-2.5 py-1 text-[12.5px] font-medium transition-colors ${value === t ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"}`}
          >
            {thLabel(t)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Summary({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-2 divide-x divide-y divide-line-soft sm:grid-cols-4 sm:divide-y-0">
          <Stat label="추정 월소득" value={manwon(result.monthlyIncomeEstimate)} tone="success" sub={`${result.incomeMonths}개월·본인이체 제외`} />
          <Stat label="총 입금" value={manwon(result.totalIn)} />
          <Stat label="총 출금" value={manwon(result.totalOut)} />
          <Stat label="의심 거래" value={result.flags.length} tone={result.flags.length ? "danger" : undefined} />
        </div>
        <div className="border-t border-line-soft px-5 py-2.5 text-xs text-muted">
          분석 기간 {formatDate(result.periodFrom)} ~ {formatDate(result.periodTo)} · 총 {result.count}건 · 기준금액 이상 {result.thresholdRows.length}건
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <MiniCard icon={<HandCoins size={16} className="text-brand" />} label="본인계좌 자동 매칭" value={`${result.selfTransferCount}건`} sub={`${manwon(result.selfTransferAmount)} · 소득/지출서 제외`} />
        <MiniCard icon={<CreditCard size={16} className="text-warning" />} label="카드 현금서비스" value={`${result.cashAdvances.length}건`} sub="단기카드대출 자동 탐지" />
        <MiniCard icon={<LineChart size={16} className="text-info" />} label="은행→증권·코인 유출" value={`${result.crossAccount.length}건`} sub="계좌 간 자금 이동 체크" />
        <MiniCard icon={<AlertTriangle size={16} className="text-danger" />} label="편파변제·낭비 의심" value={`${result.flags.length}건`} sub="보정·심문 쟁점" />
      </div>

      <Card>
        <CardHeader title="지출 카테고리" />
        <div className="space-y-2.5 p-5">
          {result.categories.map((c) => {
            const max = result.categories[0]?.out || 1;
            return (
              <div key={c.label}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="text-ink-soft">{c.label} <span className="text-faint">({c.count})</span></span>
                  <span className="font-semibold tabular-nums">{manwon(c.out)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(c.out / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function MiniCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2">{icon}</div>
      <div className="min-w-0">
        <div className="text-[12px] text-muted">{label}</div>
        <div className="text-base font-bold text-ink">{value}</div>
        <div className="truncate text-[11px] text-faint">{sub}</div>
      </div>
    </Card>
  );
}

function Sheet({ title, rows, onDownload, colorMode }: { title: string; rows: SheetRow[]; onDownload: () => void; colorMode: ColorMode }) {
  return (
    <Card>
      <CardHeader
        title={title}
        desc={`${rows.length}건`}
        action={<Button size="sm" variant="secondary" onClick={onDownload} disabled={!rows.length}><Download size={14} /> 엑셀(CSV)</Button>}
      />
      {rows.length === 0 ? (
        <div className="p-8 text-center text-[13px] text-muted">해당 거래가 없습니다.</div>
      ) : (
        <div className="max-h-[28rem] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line-soft text-left text-[11px] uppercase tracking-wide text-faint">
                <th className="px-4 py-2 font-semibold">날짜</th>
                <th className="px-2 py-2 font-semibold">구분</th>
                <th className="px-2 py-2 text-right font-semibold">금액</th>
                <th className="px-3 py-2 font-semibold">거래상대방</th>
                <th className="px-3 py-2 font-semibold">목적</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map((r, i) => {
                const isOut = r.type === "출금";
                const amtColor =
                  colorMode === "unified" ? "text-ink" : isOut ? "text-danger" : "text-info";
                return (
                  <tr key={i} className="hover:bg-surface-2">
                    <td className="whitespace-nowrap px-4 py-2 text-muted">{formatDate(r.date)}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${colorMode === "unified" ? "bg-warning-bg text-warning" : isOut ? "bg-danger-bg text-danger" : "bg-info-bg text-info"}`}>{r.type}</span>
                    </td>
                    <td className={`px-2 py-2 text-right font-semibold tabular-nums ${amtColor}`}>{isOut ? "-" : "+"}{won(r.amount)}</td>
                    <td className="px-3 py-2 text-ink-soft">{r.counterpart || r.desc}</td>
                    <td className="px-3 py-2">
                      {r.purpose ? <Badge tone={r.purpose.includes("본인") ? "muted" : "info"}>{r.purpose}</Badge> : <span className="text-faint">{srcLabel(r.source)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function LoanSheet({ result }: { result: AnalysisResult }) {
  const loan = result.loan!;
  return (
    <Card>
      <CardHeader
        title="대출금 사용처 소명표"
        desc={`${formatDate(loan.loanDate)} · ${won(loan.loanAmount)} 대출`}
        action={<Badge tone={loan.depositMatched ? "success" : "warning"}>{loan.depositMatched ? "입금 확인" : "입금 미확인"}</Badge>}
      />
      <div className="p-5">
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-surface-2 py-3"><div className="text-xs text-muted">대출금</div><div className="font-bold tabular-nums">{manwon(loan.loanAmount)}</div></div>
          <div className="rounded-lg bg-surface-2 py-3"><div className="text-xs text-muted">추적된 사용</div><div className="font-bold tabular-nums text-brand-700">{manwon(loan.tracedTotal)}</div></div>
          <div className="rounded-lg bg-surface-2 py-3"><div className="text-xs text-muted">미소명 잔액</div><div className={`font-bold tabular-nums ${loan.remaining > 0 ? "text-danger" : "text-success"}`}>{manwon(loan.remaining)}</div></div>
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">대출일 이후 출금(사용처) 누적</div>
        <ol className="mt-2 space-y-1.5">
          {loan.uses.map((u, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-line-soft px-3 py-2 text-[13px]">
              <span className="text-muted">{formatDate(u.date)}</span>
              <span className="flex-1 text-ink-soft">{u.counterpart}</span>
              {u.toOtherAccount && <Badge tone="warning">타계좌·상환</Badge>}
              <span className="font-semibold tabular-nums text-danger">-{won(u.amount)}</span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

function OverdraftSheet({ result }: { result: AnalysisResult }) {
  const od = result.overdraft!;
  return (
    <Card>
      <CardHeader
        title="마이너스 통장 추적"
        desc={`${formatDate(od.startDate)} 이후 출금 누적 · 한도 ${won(od.limit)}`}
        action={<Badge tone={od.reachedDate ? "danger" : "muted"}>{od.reachedDate ? `${formatDate(od.reachedDate)} 한도 도달` : "한도 미도달"}</Badge>}
      />
      <div className="max-h-[28rem] overflow-y-auto p-5">
        <ol className="space-y-1.5">
          {od.steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-line-soft px-3 py-2 text-[13px]">
              <span className="text-muted">{formatDate(s.date)}</span>
              <span className="flex-1 text-ink-soft">{s.counterpart}</span>
              <span className="tabular-nums text-danger">-{won(s.amount)}</span>
              <span className="w-28 text-right text-xs tabular-nums text-muted">누적 {won(s.cumulative)}</span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

function Insights({ result }: { result: AnalysisResult }) {
  return (
    <Card>
      <CardHeader title="AI 인사이트" desc="보정·심문에서 쟁점이 될 수 있는 거래" action={<Info size={15} className="text-brand" />} />
      {result.flags.length === 0 ? (
        <div className="p-8 text-center text-[13px] text-muted">특이 거래가 발견되지 않았습니다.</div>
      ) : (
        <div className="divide-y divide-line-soft">
          {result.flags.map((f, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3">
              <AlertTriangle size={17} className={`mt-0.5 shrink-0 ${f.level === "high" ? "text-danger" : "text-warning"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{f.txn.counterpart || f.txn.desc}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-danger">-{won(Math.abs(f.txn.amount))}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs">
                  <span className="text-muted">{formatDate(f.txn.date)}</span>
                  <Badge tone={f.level === "high" ? "danger" : "warning"}>{f.reason}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="border-t border-line-soft px-5 py-3 text-[11px] text-faint">※ 자동 분석은 참고용이며, 최종 소명·판단은 담당자 검토가 필요합니다.</p>
    </Card>
  );
}
