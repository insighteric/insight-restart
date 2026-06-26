"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  Wand2,
  Share2,
  FileSignature,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileText,
  Save,
  ChevronRight,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Button, Badge, Field, Spinner } from "@/components/ui";
import { ShareDialog } from "@/components/ShareDialog";
import { Modal } from "@/components/Modal";
import { correctionCatLabel, ddayLabel, formatDate } from "@/lib/format";
import { buildClientGuideText, buildEmailSubject } from "@/lib/corrections";
import type { Correction, CorrectionItem, CorrectionItemCategory } from "@/lib/types";

const SAMPLE = `보정명령
사건  2026개회12345 개인회생
신청인  김민수

1. 신청인의 최근 3개월 급여명세서 및 소득금액증명원을 제출하여 현재 소득을 소명할 것.
2. 신청인 명의로 가입된 보험의 해약환급금 예상액 확인서를 보험회사별로 제출할 것.
3. 2025. 10.경 신청인 계좌에서 출금된 5,000,000원의 사용처를 소명할 자료를 제출할 것.
4. 채권자목록에 누락된 채권자가 있는지 확인하고, 한국신용정보원 신용정보 조회서를 제출할 것.
위 보정사항을 이 명령을 송달받은 날부터 14일 안에 보정하시기 바랍니다.`;

const catTone: Record<CorrectionItemCategory, "brand" | "info" | "warning" | "danger" | "success" | "muted"> = {
  income: "brand",
  asset: "info",
  debt: "warning",
  living: "success",
  plan: "brand",
  liquidation: "info",
  service: "muted",
  transfer: "danger",
  document: "warning",
  etc: "muted",
};

export default function CorrectionsPage() {
  const store = useStore();
  const { cases, clientById, corrections, settings } = store;

  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  const [raw, setRaw] = useState("");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [items, setItems] = useState<CorrectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"ai" | "rule" | null>(null);
  const [guide, setGuide] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const selectedCase = cases.find((c) => c.id === caseId);
  const client = selectedCase ? clientById(selectedCase.clientId) : undefined;

  const regenGuide = (its: CorrectionItem[]) => {
    if (!selectedCase || !client) return;
    setGuide(
      buildClientGuideText({
        clientName: client.name,
        court: selectedCase.court,
        dueAt,
        items: its.filter((i) => !i.done),
        firmName: settings.firmName,
      }),
    );
  };

  const analyze = async () => {
    if (!raw.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/correction", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const data = await res.json();
      const its: CorrectionItem[] = data.items ?? [];
      setItems(its);
      setSource(data.source);
      regenGuide(its);
    } finally {
      setLoading(false);
    }
  };

  const toggleDone = (id: string) => {
    const next = items.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    setItems(next);
    regenGuide(next);
  };

  const save = () => {
    if (!selectedCase || items.length === 0) return;
    const co: Correction = {
      id: `co_${Date.now().toString(36)}`,
      caseId: selectedCase.id,
      court: selectedCase.court,
      caseNo: selectedCase.caseNo,
      receivedAt,
      dueAt,
      items,
      status: "in_progress",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    store.addCorrection(co);
    // 보정기한 일정 자동 추가
    store.addEvent({
      id: `ev_${Date.now().toString(36)}`,
      caseId: selectedCase.id,
      type: "correction_due",
      title: `${client?.name} 보정기한 (${selectedCase.court})`,
      date: dueAt,
      notifyKakao: true,
      notifyEmail: true,
    });
    setSavedId(co.id);
    setTimeout(() => setSavedId(null), 2500);
  };

  const loadExisting = (co: Correction) => {
    setCaseId(co.caseId);
    setItems(co.items);
    setReceivedAt(co.receivedAt);
    setDueAt(co.dueAt);
    setRaw(co.items.map((i, n) => `${n + 1}. ${i.originalText}`).join("\n"));
    setSource(null);
    const cl = clientById(cases.find((c) => c.id === co.caseId)?.clientId ?? "");
    setGuide(
      buildClientGuideText({
        clientName: cl?.name ?? "의뢰인",
        court: co.court,
        dueAt: co.dueAt,
        items: co.items.filter((i) => !i.done),
        firmName: settings.firmName,
      }),
    );
  };

  const replyDraft = useMemo(() => buildReplyDraft(selectedCase?.court, selectedCase?.caseNo, client?.name, items), [selectedCase, client, items]);

  return (
    <div>
      <PageHeader
        title="보정명령 처리"
        desc="보정명령 원문을 붙여넣으면 AI가 항목별로 정리하고, 의뢰인 안내문과 보정서 초안까지 만들어 드립니다."
        action={
          <Badge tone="brand">
            <Sparkles size={12} /> AI 기능
          </Badge>
        }
      />

      {/* 진행 중 보정 */}
      {corrections.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {corrections.map((co) => {
            const cl = clientById(cases.find((c) => c.id === co.caseId)?.clientId ?? "");
            const done = co.items.filter((i) => i.done).length;
            return (
              <button
                key={co.id}
                onClick={() => loadExisting(co)}
                className="group flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-left text-[13px] hover:border-brand-200 hover:bg-brand-50/40"
              >
                <ClipboardCheck size={15} className="text-brand" />
                <span className="font-medium text-ink">{cl?.name}</span>
                <span className="text-muted">{co.court}</span>
                <Badge tone={(ddayLabel(co.dueAt).startsWith("D+") ? "danger" : "warning") as never}>{ddayLabel(co.dueAt)}</Badge>
                <span className="text-xs text-faint">{done}/{co.items.length}</span>
                <ChevronRight size={14} className="text-faint group-hover:text-brand" />
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* 입력 */}
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader title="1. 보정명령 입력" desc="법원에서 받은 보정명령 원문을 붙여넣으세요." />
            <div className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="사건">
                  <select
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                  >
                    {cases.map((c) => {
                      const cl = clientById(c.clientId);
                      return (
                        <option key={c.id} value={c.id}>
                          {cl?.name} · {c.court}
                        </option>
                      );
                    })}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="수령일">
                    <input
                      type="date"
                      value={receivedAt}
                      onChange={(e) => setReceivedAt(e.target.value)}
                      className="h-9.5 w-full rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                    />
                  </Field>
                  <Field label="보정기한">
                    <input
                      type="date"
                      value={dueAt}
                      onChange={(e) => setDueAt(e.target.value)}
                      className="h-9.5 w-full rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                    />
                  </Field>
                </div>
              </div>

              <Field label="보정명령 원문">
                <textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  rows={10}
                  placeholder="여기에 보정명령 전문을 붙여넣으세요…"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
              </Field>

              <div className="flex items-center justify-between">
                <button onClick={() => setRaw(SAMPLE)} className="text-[13px] font-medium text-brand hover:underline">
                  예시 불러오기
                </button>
                <Button onClick={analyze} disabled={!raw.trim() || loading}>
                  {loading ? <Spinner /> : <Wand2 size={16} />}
                  {loading ? "분석 중…" : "AI로 분석"}
                </Button>
              </div>
            </div>
          </Card>

          {/* 분석 결과 */}
          {items.length > 0 && (
            <Card>
              <CardHeader
                title="2. 분석 결과"
                desc={`${items.length}개 항목 · 완료 ${items.filter((i) => i.done).length}건`}
                action={
                  <Badge tone={source === "ai" ? "brand" : "muted"}>
                    {source === "ai" ? "AI 분석" : source === "rule" ? "규칙 분석" : "불러옴"}
                  </Badge>
                }
              />
              <div className="divide-y divide-line-soft">
                {items.map((it, idx) => (
                  <div key={it.id} className="p-5">
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleDone(it.id)} className="mt-0.5 shrink-0">
                        {it.done ? (
                          <CheckCircle2 size={20} className="text-success" />
                        ) : (
                          <Circle size={20} className="text-faint hover:text-brand" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-faint">#{idx + 1}</span>
                          <Badge tone={catTone[it.category]}>{correctionCatLabel[it.category]}</Badge>
                        </div>
                        <p className={`text-sm font-semibold ${it.done ? "text-faint line-through" : "text-ink"}`}>
                          {it.summary}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{it.originalText}</p>

                        {it.requiredDocs && it.requiredDocs.length > 0 && (
                          <div className="mt-2.5">
                            <div className="mb-1 text-[11px] font-semibold text-faint">필요서류</div>
                            <div className="flex flex-wrap gap-1.5">
                              {it.requiredDocs.map((d, i) => (
                                <span key={i} className="rounded-md bg-surface-2 px-2 py-1 text-[12px] text-ink-soft">
                                  {d}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {it.procedure && it.procedure.length > 0 && (
                          <div className="mt-2.5">
                            <div className="mb-1 text-[11px] font-semibold text-faint">처리 절차</div>
                            <ol className="space-y-1">
                              {it.procedure.map((p, i) => (
                                <li key={i} className="flex gap-2 text-[13px] text-ink-soft">
                                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                                    {i + 1}
                                  </span>
                                  {p}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {it.clientNote && (
                          <p className="mt-2.5 rounded-lg bg-warning-bg px-3 py-2 text-[12px] text-warning">
                            💡 {it.clientNote}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-line-soft px-5 py-3.5">
                <Button variant="secondary" onClick={() => setReplyOpen(true)}>
                  <FileSignature size={15} /> 보정서 초안
                </Button>
                <Button onClick={save}>
                  {savedId ? <CheckCircle2 size={15} /> : <Save size={15} />}
                  {savedId ? "저장됨" : "사건에 저장"}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* 의뢰인 안내문 */}
        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-20">
            <CardHeader
              title="3. 의뢰인 안내문"
              desc="자동 생성된 안내문입니다. 수정 후 공유하세요."
              action={<Sparkles size={15} className="text-brand" />}
            />
            <div className="p-5">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <FileText size={28} className="text-faint" />
                  <p className="text-[13px] text-muted">보정명령을 분석하면<br />의뢰인용 안내문이 자동으로 만들어집니다.</p>
                </div>
              ) : (
                <>
                  <textarea
                    value={guide}
                    onChange={(e) => setGuide(e.target.value)}
                    rows={16}
                    className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[12.5px] leading-relaxed outline-none focus:border-brand-300 focus:bg-surface focus:ring-2 focus:ring-brand-100"
                  />
                  <Button className="mt-3 w-full" onClick={() => setShareOpen(true)}>
                    <Share2 size={16} /> 카톡·이메일로 공유
                  </Button>
                  <p className="mt-2 text-center text-[11px] text-faint">
                    기한: {formatDate(dueAt)} ({ddayLabel(dueAt)})
                  </p>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        subject={client ? buildEmailSubject(client.name, selectedCase?.court ?? "") : undefined}
        body={guide}
        toEmail={client?.email}
        toPhone={client?.phone}
      />

      <Modal open={replyOpen} onClose={() => setReplyOpen(false)} title="보정서(답변서) 초안" desc="법원 제출용 초안입니다. 검토 후 사용하세요." size="xl">
        <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-4 text-[13px] leading-relaxed text-ink-soft">
{replyDraft}
        </pre>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => navigator.clipboard.writeText(replyDraft)}
          >
            <FileText size={15} /> 복사
          </Button>
          <Button onClick={() => setReplyOpen(false)}>닫기</Button>
        </div>
      </Modal>
    </div>
  );
}

function buildReplyDraft(
  court?: string,
  caseNo?: string,
  name?: string,
  items?: CorrectionItem[],
): string {
  const lines: string[] = [];
  lines.push("보 정 서");
  lines.push("");
  lines.push(`사건       ${caseNo ?? "____________"}`);
  lines.push(`신청인     ${name ?? "____________"}`);
  lines.push("");
  lines.push(`위 사건에 관하여 신청인은 귀원의 보정명령에 따라 다음과 같이 보정합니다.`);
  lines.push("");
  lines.push("다       음");
  lines.push("");
  (items ?? []).forEach((it, i) => {
    lines.push(`${i + 1}. ${it.summary ?? it.originalText}`);
    if (it.requiredDocs?.length) {
      lines.push(`   - 첨부: ${it.requiredDocs.join(", ")}`);
    }
    lines.push(`   - (작성) 위 항목에 대하여 ____________________ 함을 소명합니다.`);
    lines.push("");
  });
  lines.push("첨 부 서 류");
  const docs = Array.from(new Set((items ?? []).flatMap((i) => i.requiredDocs ?? [])));
  docs.forEach((d, i) => lines.push(`${i + 1}. ${d}   1부`));
  lines.push("");
  lines.push(`${new Date().getFullYear()}.    .    .`);
  lines.push("");
  lines.push(`신청인          ${name ?? ""}  (인)`);
  lines.push("");
  lines.push(`${court ?? "________법원"}  귀중`);
  return lines.join("\n");
}
