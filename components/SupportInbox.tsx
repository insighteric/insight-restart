"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, Button, Badge, Field, Input } from "@/components/ui";

interface Ticket { id: number; subject: string | null; body: string; status: string; reply: string | null; created_at: string; replied_at: string | null }

export function SupportInbox() {
  const { configured, firmId, user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !firmId) { setTickets([]); return; }
    const { data, error } = await sb.from("support_tickets")
      .select("id,subject,body,status,reply,created_at,replied_at")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message); else setTickets((data ?? []) as Ticket[]);
  }, [firmId]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!body.trim()) return;
    const sb = getSupabase();
    if (!sb || !firmId || !user) { setErr("로그인이 필요합니다."); return; }
    setBusy(true); setErr(null);
    const { error } = await sb.from("support_tickets").insert({ firm_id: firmId, member_id: user.id, subject: subject.trim() || null, body: body.trim() });
    if (error) setErr(error.message);
    else { setSubject(""); setBody(""); setSent(true); setTimeout(() => setSent(false), 2500); await load(); }
    setBusy(false);
  };

  if (!configured) return null;

  return (
    <Card>
      <CardHeader title="1:1 문의" desc="운영자에게 직접 문의하세요. 답변은 아래에 표시됩니다." action={<MessageSquare size={15} className="text-brand" />} />
      <div className="space-y-3 p-5">
        <Field label="제목 (선택)"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="문의 제목" /></Field>
        <Field label="내용">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            placeholder="문의 내용을 입력하세요" />
        </Field>
        {err && <p className="text-[12px] text-danger">{err}</p>}
        <Button onClick={submit} disabled={busy || !body.trim()}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {sent ? "접수됨" : "문의 보내기"}</Button>

        {tickets && tickets.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-[12.5px] font-semibold text-ink-soft">내 문의 내역 {tickets.length}건</div>
            {tickets.map((t) => (
              <div key={t.id} className="rounded-lg border border-line-soft p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink">{t.subject || "문의"}</span>
                  <Badge tone={t.status === "answered" ? "success" : t.status === "closed" ? "muted" : "warning"}>
                    {t.status === "answered" ? "답변완료" : t.status === "closed" ? "종료" : "대기중"}
                  </Badge>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[12.5px] text-muted">{t.body}</p>
                <div className="text-[11px] text-faint">{t.created_at.slice(0, 16).replace("T", " ")}</div>
                {t.reply && (
                  <div className="mt-2 rounded-md bg-brand-50 p-2.5 text-[12.5px]">
                    <span className="font-semibold text-brand-700">운영자 답변</span>
                    <p className="mt-0.5 whitespace-pre-wrap text-ink-soft">{t.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
