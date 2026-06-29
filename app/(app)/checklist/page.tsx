"use client";

import { useMemo, useState } from "react";
import { ListChecks, ExternalLink, Copy, Check, FileText, Zap, Loader2, Paperclip } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Button, Badge, Input, EmptyState, Donut } from "@/components/ui";
import { CaseUploads } from "@/components/CaseUploads";
import { caseTypeLabel, formatDate } from "@/lib/format";
import { DOC_MASTER, DOC_CATEGORY_LABEL, docsForType, type DocCategory, type DocSpec } from "@/lib/docChecklist";
import { isCodefDoc } from "@/lib/codef";
import { track } from "@/lib/track";
import type { DocCheckStatus } from "@/lib/types";

const logId = () => `lg_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`;

const STATUS: { key: DocCheckStatus; label: string; tone: string }[] = [
  { key: "todo", label: "미비", tone: "border-line text-muted" },
  { key: "requested", label: "요청", tone: "border-warning text-warning bg-warning-bg" },
  { key: "done", label: "완료", tone: "border-success text-success bg-success-bg" },
  { key: "na", label: "해당없음", tone: "border-line text-faint" },
];
const todayISO = () => new Date().toISOString().slice(0, 10);

function ProgChip({ label, n, tone }: { label: string; n: number; tone: "success" | "warning" | "brand" | "muted" }) {
  const c = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "brand" ? "text-brand-700" : "text-muted";
  return (
    <div className="rounded-lg border border-line-soft bg-surface-2 px-3 py-2 text-center">
      <div className={`text-[18px] font-bold tabular-nums ${c}`}>{n}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

export default function ChecklistPage() {
  const store = useStore();
  const [caseId, setCaseId] = useState(store.cases[0]?.id ?? "");
  const [copied, setCopied] = useState(false);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [openUp, setOpenUp] = useState<string | null>(null);

  const c = store.caseById(caseId);
  const checks = store.docChecksForCase(caseId);
  const statusOf = (docKey: string): DocCheckStatus => checks.find((x) => x.docKey === docKey)?.status ?? "todo";
  const checkOf = (docKey: string) => checks.find((x) => x.docKey === docKey);

  const docs = useMemo(() => (c ? docsForType(c.type) : DOC_MASTER), [c]);

  const summary = useMemo(() => {
    const total = docs.length;
    let done = 0, requested = 0, na = 0;
    for (const d of docs) {
      const s = statusOf(d.key);
      if (s === "done") done++;
      else if (s === "requested") requested++;
      else if (s === "na") na++;
    }
    const todo = total - done - requested - na;
    const denom = total - na || 1;
    return { total, done, requested, na, todo, pct: Math.round((done / denom) * 100) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, checks]);

  const grouped = useMemo(() => {
    const g = new Map<DocCategory, DocSpec[]>();
    for (const d of docs) {
      if (!g.has(d.category)) g.set(d.category, []);
      g.get(d.category)!.push(d);
    }
    return [...g.entries()];
  }, [docs]);

  const setStatus = (d: DocSpec, status: DocCheckStatus) => {
    const patch: Partial<{ status: DocCheckStatus; receivedAt?: string }> = { status };
    if (status === "done" && !checkOf(d.key)?.receivedAt) patch.receivedAt = todayISO();
    store.setDocCheck(caseId, d.key, patch);
  };

  // 공공·행정 서류 자동발급 (CODEF). 키 미설정 시 목업으로 동작.
  const autoIssue = async (d: DocSpec) => {
    const client = c ? store.clientById(c.clientId) : undefined;
    setIssuing(d.key);
    try {
      const res = await fetch("/api/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ docKey: d.key, clientName: client?.name }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        track("issue", { docKey: d.key });
        store.setDocCheck(caseId, d.key, {
          status: "done",
          receivedAt: j.issuedAt ?? todayISO(),
          memo: j.mock ? "CODEF 자동발급(목업) — 키 설정 시 실발급" : "CODEF 자동발급",
        });
        store.addCaseLog({
          id: logId(), caseId, author: "자동발급", body: `${d.name} ${j.mock ? "자동발급(목업)" : "자동발급 완료"} — ${j.org}`, createdAt: new Date().toISOString(),
        });
        if (j.mock) alert(`${d.name}\n\n${j.message}`);
      } else {
        alert(`자동발급 실패: ${j.message ?? "오류"}`);
      }
    } catch {
      alert("자동발급 요청 중 오류가 발생했습니다.");
    } finally {
      setIssuing(null);
    }
  };

  const copyGuide = async () => {
    const client = c ? store.clientById(c.clientId) : undefined;
    const pending = docs.filter((d) => {
      const s = statusOf(d.key);
      return s === "todo" || s === "requested";
    });
    const lines = pending.map((d) => `▢ ${d.name} — ${d.issuer}${d.url ? ` (${d.url})` : ""}`);
    const text =
      `[Insight Restart] ${client?.name ?? "의뢰인"}님 준비서류 안내\n` +
      `아래 서류를 발급·준비해 주세요.\n\n` +
      (lines.length ? lines.join("\n") : "준비할 서류가 없습니다.") +
      `\n\n※ 온라인 발급처는 공동인증서(공인인증서)로 본인 발급 가능합니다.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("복사에 실패했습니다.");
    }
  };

  if (!store.cases.length) {
    return (
      <div>
        <PageHeader title="서류 체크리스트" desc="접수·보정 서류 준비 현황" />
        <Card><EmptyState icon={<ListChecks size={30} />} title="사건이 없습니다" desc="사건을 먼저 등록하세요." /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="서류 체크리스트"
        desc="접수·보정 서류 약 50종을 사건별로 관리합니다. 발급처·온라인 링크 포함."
        action={
          <Button variant="secondary" onClick={copyGuide}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "의뢰인 안내문 복사"}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          className="h-10 rounded-lg border border-line bg-surface px-3 text-sm font-medium outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
        >
          {store.cases.map((cs) => {
            const cl = store.clientById(cs.clientId);
            return <option key={cs.id} value={cs.id}>{cl?.name ?? "의뢰인"} · {caseTypeLabel[cs.type]}{cs.caseNo ? ` (${cs.caseNo})` : ""}</option>;
          })}
        </select>
        {c && <Badge tone="muted">{caseTypeLabel[c.type]} 기준 {docs.length}종</Badge>}
      </div>

      {/* 진행률 */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-5 p-5">
          <Donut
            value={summary.pct}
            tone={summary.pct >= 100 ? "success" : "brand"}
            center={<><span className="text-[19px] font-extrabold tabular-nums text-ink">{summary.pct}%</span><span className="text-[10px] text-muted">완료</span></>}
          />
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            <ProgChip label="완료" n={summary.done} tone="success" />
            <ProgChip label="요청" n={summary.requested} tone="warning" />
            <ProgChip label="미비" n={summary.todo} tone="brand" />
            <ProgChip label="해당없음" n={summary.na} tone="muted" />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {grouped.map(([cat, list]) => {
          const catDone = list.filter((d) => statusOf(d.key) === "done").length;
          return (
            <Card key={cat}>
              <CardHeader
                title={DOC_CATEGORY_LABEL[cat]}
                desc={`${catDone}/${list.length} 완료`}
                action={<FileText size={15} className="text-faint" />}
              />
              <div className="divide-y divide-line-soft">
                {list.map((d) => {
                  const cur = statusOf(d.key);
                  const rec = checkOf(d.key);
                  const upCount = store.uploadsForCase(caseId).filter((u) => u.docKey === d.key).length;
                  return (
                    <div key={d.key} className="px-5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cur === "done" ? "bg-success" : cur === "requested" ? "bg-warning" : cur === "na" ? "bg-line" : "border border-line bg-transparent"}`} />
                            <span className="text-[14px] font-medium text-ink">{d.name}</span>
                            {d.note && <span className="text-[11px] text-faint">· {d.note}</span>}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                            발급처: {d.issuer}
                            {d.url && (
                              <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-brand hover:underline">
                                바로가기 <ExternalLink size={11} />
                              </a>
                            )}
                            {cur === "done" && rec?.receivedAt && <span className="text-success">· 수령 {formatDate(rec.receivedAt)}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => setOpenUp(openUp === d.key ? null : d.key)}
                            title="받은 서류 파일 첨부"
                            className={`mr-1 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[12px] font-semibold transition-colors ${
                              upCount > 0 ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"
                            }`}
                          >
                            <Paperclip size={12} /> 첨부{upCount > 0 ? ` ${upCount}` : ""}
                          </button>
                          {isCodefDoc(d.key) && cur !== "done" && (
                            <button
                              onClick={() => autoIssue(d)}
                              disabled={issuing === d.key}
                              title="공공·행정 서류 자동발급(CODEF)"
                              className="mr-1 inline-flex items-center gap-1 rounded-md border border-brand bg-brand-50 px-2 py-1 text-[12px] font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                            >
                              {issuing === d.key ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} 자동발급
                            </button>
                          )}
                          {STATUS.map((st) => (
                            <button
                              key={st.key}
                              onClick={() => setStatus(d, st.key)}
                              className={`rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                                cur === st.key ? st.tone : "border-line text-faint hover:bg-surface-2"
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {(cur === "requested" || (rec?.memo ?? "") !== "") && (
                        <Input
                          value={rec?.memo ?? ""}
                          onChange={(e) => store.setDocCheck(caseId, d.key, { memo: e.target.value })}
                          placeholder="메모 (예: 어느 기관에 요청, 예상 발급일 등)"
                          className="mt-2 h-8 text-[12.5px]"
                        />
                      )}
                      {openUp === d.key && (
                        <div className="mt-3 rounded-lg border border-line-soft bg-surface-2 p-3">
                          <CaseUploads caseId={caseId} docKey={d.key} compact />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-faint">
        ※ <Zap size={10} className="inline text-brand" /> <b>자동발급</b>은 공공·행정 서류(정부24·홈택스·대법원·4대보험)를 CODEF로 발급합니다. 현재는 <b>목업</b>(키 미설정)으로 흐름만 동작하며, CODEF 키를 설정하면 의뢰인 간편인증으로 실발급됩니다. 은행·카드 거래내역은 거래내역 분석에서 업로드로 처리하세요.
      </p>
    </div>
  );
}
