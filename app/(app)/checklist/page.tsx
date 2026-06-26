"use client";

import { useMemo, useState } from "react";
import { ListChecks, ExternalLink, Copy, Check, FileText } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Button, Badge, Input, EmptyState } from "@/components/ui";
import { caseTypeLabel, formatDate } from "@/lib/format";
import { DOC_MASTER, DOC_CATEGORY_LABEL, docsForType, type DocCategory, type DocSpec } from "@/lib/docChecklist";
import type { DocCheckStatus } from "@/lib/types";

const STATUS: { key: DocCheckStatus; label: string; tone: string }[] = [
  { key: "todo", label: "미비", tone: "border-line text-muted" },
  { key: "requested", label: "요청", tone: "border-warning text-warning bg-warning-bg" },
  { key: "done", label: "완료", tone: "border-success text-success bg-success-bg" },
  { key: "na", label: "해당없음", tone: "border-line text-faint" },
];
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function ChecklistPage() {
  const store = useStore();
  const [caseId, setCaseId] = useState(store.cases[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

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

  const copyGuide = async () => {
    const client = c ? store.clientById(c.clientId) : undefined;
    const pending = docs.filter((d) => {
      const s = statusOf(d.key);
      return s === "todo" || s === "requested";
    });
    const lines = pending.map((d) => `▢ ${d.name} — ${d.issuer}${d.url ? ` (${d.url})` : ""}`);
    const text =
      `[회생ON] ${client?.name ?? "의뢰인"}님 준비서류 안내\n` +
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
        <div className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-ink tnum">{summary.pct}%</span>
            <span className="text-[13px] text-muted">준비 완료</span>
          </div>
          <div className="h-2 min-w-[140px] flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-success" style={{ width: `${summary.pct}%` }} />
          </div>
          <div className="flex gap-2 text-[12px]">
            <Badge tone="success">완료 {summary.done}</Badge>
            <Badge tone="warning">요청 {summary.requested}</Badge>
            <Badge tone="muted">미비 {summary.todo}</Badge>
            <Badge tone="muted">해당없음 {summary.na}</Badge>
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
                  return (
                    <div key={d.key} className="px-5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
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
                        <div className="flex shrink-0 gap-1">
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
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-faint">※ ‘의뢰인 안내문 복사’는 미비·요청 상태 서류만 모아 카톡/문자용 안내문을 클립보드에 복사합니다.</p>
    </div>
  );
}
