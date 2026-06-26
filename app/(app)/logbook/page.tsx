"use client";

import { useMemo, useState } from "react";
import { NotebookPen, Search, Pin, PinOff, Trash2, ChevronDown, Send, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Card, Button, Badge, Textarea, EmptyState } from "@/components/ui";
import { caseTypeLabel, stageLabel, formatDate } from "@/lib/format";
import { feeStatus } from "@/lib/fees";

const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`;

export default function LogbookPage() {
  const store = useStore();
  const { firmName } = useAuth();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().replace(/\s/g, "");
    return store.cases
      .map((c) => {
        const client = store.clientById(c.clientId);
        const logs = store.logsForCase(c.id);
        const fee = feeStatus(store.feePlanForCase(c.id));
        return { case: c, client, logs, latest: logs[0], fee };
      })
      .filter((r) =>
        !needle ||
        (r.client?.name ?? "").replace(/\s/g, "").includes(needle) ||
        (r.case.caseNo ?? "").replace(/\s/g, "").includes(needle),
      )
      .sort((a, b) => (b.latest?.createdAt ?? "").localeCompare(a.latest?.createdAt ?? ""));
  }, [store, q]);

  const unpaidCount = rows.filter((r) => r.fee && r.fee.unpaid > 0).length;

  return (
    <div>
      <PageHeader
        title="사건기록부"
        desc="사건별 업무 기록을 한곳에서. 미납 의뢰인은 자동 표시됩니다."
        action={<Badge tone={unpaidCount ? "danger" : "muted"}><AlertTriangle size={11} /> 미납 {unpaidCount}건</Badge>}
      />

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="의뢰인·사건번호 검색"
          className="h-9.5 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={<NotebookPen size={30} />} title="사건이 없습니다" desc="사건을 등록하면 여기에서 기록을 남길 수 있습니다." />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {rows.map(({ case: c, client, logs, latest, fee }) => {
            const expanded = open === c.id;
            const unpaid = fee && fee.unpaid > 0;
            return (
              <Card key={c.id}>
                <button onClick={() => setOpen(expanded ? null : c.id)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{client?.name ?? "의뢰인"}</span>
                      <Badge tone="muted">{caseTypeLabel[c.type]}</Badge>
                      <Badge tone="info">{stageLabel[c.stage]}</Badge>
                      {unpaid && (
                        <Badge tone={fee!.isOverdue ? "danger" : "warning"}>
                          <AlertTriangle size={11} /> {fee!.isOverdue ? "연체" : "미납"}
                        </Badge>
                      )}
                      {c.caseNo && <span className="text-[12px] text-faint">{c.caseNo}</span>}
                    </div>
                    <div className="mt-1 truncate text-[12.5px] text-muted">
                      {latest ? (
                        <>
                          {latest.pinned && <Pin size={11} className="mr-1 inline text-brand" />}
                          <span className="text-faint">{formatDate(latest.createdAt)} · {latest.author} ·</span> {latest.body}
                        </>
                      ) : (
                        <span className="text-faint">기록 없음 — 첫 기록을 남겨보세요</span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-faint">{logs.length}건</span>
                  <ChevronDown size={18} className={`shrink-0 text-faint transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>

                {expanded && (
                  <LogThread
                    logs={logs}
                    defaultAuthor={firmName ? "담당 사무장" : "담당 사무장"}
                    onAdd={(author, body, pinned) =>
                      store.addCaseLog({ id: uid("lg"), caseId: c.id, author, body, pinned, createdAt: new Date().toISOString() })
                    }
                    onTogglePin={(id, pinned) => store.updateCaseLog(id, { pinned })}
                    onRemove={(id) => store.removeCaseLog(id)}
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LogThread({
  logs,
  defaultAuthor,
  onAdd,
  onTogglePin,
  onRemove,
}: {
  logs: { id: string; author: string; body: string; pinned?: boolean; createdAt: string }[];
  defaultAuthor: string;
  onAdd: (author: string, body: string, pinned: boolean) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const [author, setAuthor] = useState(defaultAuthor);
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

  const submit = () => {
    if (!body.trim()) return;
    onAdd(author.trim() || "담당자", body.trim(), pinned);
    setBody("");
    setPinned(false);
  };

  // 고정(특이사항) 먼저, 그다음 최신순
  const sorted = [...logs].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="border-t border-line-soft p-5">
      <div className="mb-3 rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex items-center gap-2">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="작성자"
            className="h-8 w-28 rounded-lg border border-line bg-surface px-2.5 text-[13px] outline-none focus:border-brand-300"
          />
          <button
            onClick={() => setPinned((v) => !v)}
            className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[12.5px] font-medium ${pinned ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface"}`}
          >
            <Pin size={12} /> 특이사항
          </button>
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="업무 기록을 입력하세요 (예: 보정서류 접수, 의뢰인 연락, 납부 안내 등)"
          className="mt-2 text-[13px]"
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={submit} disabled={!body.trim()}><Send size={13} /> 기록 추가</Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="py-2 text-center text-[13px] text-muted">아직 기록이 없습니다.</p>
      ) : (
        <ol className="space-y-2">
          {sorted.map((l) => (
            <li key={l.id} className={`rounded-lg border px-3 py-2.5 ${l.pinned ? "border-brand-200 bg-brand-50/40" : "border-line-soft"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11.5px] text-faint">
                  {l.pinned && <Pin size={11} className="text-brand" />}
                  <span className="font-medium text-muted">{l.author}</span>
                  <span>· {formatDate(l.createdAt)}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => onTogglePin(l.id, !l.pinned)} title={l.pinned ? "고정 해제" : "특이사항 고정"} className="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface-2 hover:text-brand">
                    {l.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                  </button>
                  <button onClick={() => onRemove(l.id)} title="삭제" className="flex h-7 w-7 items-center justify-center rounded-md text-faint hover:bg-surface-2 hover:text-danger">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-soft">{l.body}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
