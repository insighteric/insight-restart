"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, CalendarClock, MessageCircle, Mail, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Button, Badge, Field, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { formatDate, ddayLabel, daysUntil, eventTypeLabel, eventTypeColor } from "@/lib/format";
import type { EventType, ScheduleEvent } from "@/lib/types";

const TYPES: EventType[] = ["correction_due", "hearing", "decision", "repayment", "submit", "consult", "custom"];

export default function SchedulePage() {
  const store = useStore();
  const { events, cases, clientById } = store;
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );
  const grouped = useMemo(() => {
    const g: Record<string, ScheduleEvent[]> = { 지남: [], 오늘: [], "7일 내": [], 다가오는: [] };
    for (const e of sorted) {
      const d = daysUntil(e.date) ?? 0;
      if (e.done || d < 0) g["지남"].push(e);
      else if (d === 0) g["오늘"].push(e);
      else if (d <= 7) g["7일 내"].push(e);
      else g["다가오는"].push(e);
    }
    return g;
  }, [sorted]);

  return (
    <div>
      <PageHeader
        title="일정·기한"
        desc="보정기한·기일·변제 납입 등 모든 기한을 한 곳에서 관리하고 카톡·이메일로 알림을 보냅니다."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> 일정 추가
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <Card>
          <EmptyState icon={<CalendarClock size={32} />} title="등록된 일정이 없습니다" action={<Button onClick={() => setOpen(true)}><Plus size={16} /> 일정 추가</Button>} />
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([label, list]) =>
            list.length === 0 ? null : (
              <div key={label}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-[13px] font-bold text-ink-soft">{label}</h3>
                  <span className="text-xs text-faint">{list.length}</span>
                  {label === "7일 내" && <Badge tone="danger">알림 필요</Badge>}
                </div>
                <Card>
                  <ul className="divide-y divide-line-soft">
                    {list.map((e) => {
                      const c = e.caseId ? cases.find((x) => x.id === e.caseId) : undefined;
                      const cl = c ? clientById(c.clientId) : undefined;
                      const d = daysUntil(e.date) ?? 0;
                      const urgent = !e.done && d >= 0 && d <= 3;
                      return (
                        <li key={e.id} className="flex items-center gap-3 px-5 py-3.5">
                          <button
                            onClick={() => store.updateEvent(e.id, { done: !e.done })}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              e.done ? "border-success bg-success text-white" : "border-line hover:border-brand"
                            }`}
                          >
                            {e.done && <Check size={14} />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-medium ${e.done ? "text-faint line-through" : "text-ink"}`}>
                              {e.title}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                              <span>{formatDate(e.date)}</span>
                              <Badge tone={eventTypeColor[e.type] as never}>{eventTypeLabel[e.type]}</Badge>
                              {cl && (
                                <Link href={`/cases/${c!.id}`} className="hover:text-brand hover:underline">
                                  {cl.name}
                                </Link>
                              )}
                              {e.notifyKakao && <MessageCircle size={12} className="text-[#9c7a00]" />}
                              {e.notifyEmail && <Mail size={12} className="text-brand-300" />}
                            </div>
                          </div>
                          {!e.done && (
                            <Badge tone={urgent ? "danger" : "warning"}>{ddayLabel(e.date)}</Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </div>
            ),
          )}
        </div>
      )}

      <AddEventDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function AddEventDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const { cases, clientById } = store;
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<EventType>("hearing");
  const [caseId, setCaseId] = useState("");
  const [kakao, setKakao] = useState(true);
  const [email, setEmail] = useState(false);

  const submit = () => {
    if (!title.trim()) return;
    store.addEvent({
      id: `ev_${Date.now().toString(36)}`,
      caseId: caseId || undefined,
      type,
      title: title.trim(),
      date,
      notifyKakao: kakao,
      notifyEmail: email,
    });
    setTitle("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="일정 추가"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={submit} disabled={!title.trim()}>추가</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="제목">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 채권자집회 출석"
            className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="날짜">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
          </Field>
          <Field label="유형">
            <select value={type} onChange={(e) => setType(e.target.value as EventType)} className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100">
              {TYPES.map((t) => (
                <option key={t} value={t}>{eventTypeLabel[t]}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="연결 사건 (선택)">
          <select value={caseId} onChange={(e) => setCaseId(e.target.value)} className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100">
            <option value="">연결 안 함</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{clientById(c.clientId)?.name} · {c.court}</option>
            ))}
          </select>
        </Field>
        <div className="flex gap-4 pt-1">
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input type="checkbox" checked={kakao} onChange={(e) => setKakao(e.target.checked)} className="accent-[var(--color-brand)]" />
            카카오톡 알림
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="accent-[var(--color-brand)]" />
            이메일 알림
          </label>
        </div>
      </div>
    </Modal>
  );
}
