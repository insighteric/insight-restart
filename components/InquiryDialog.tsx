"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { Modal } from "@/components/Modal";
import { Button, Field } from "@/components/ui";

const inputCls = "h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100";

export function InquiryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { firmName, firmId, user, memberName } = useAuth();
  const [subject, setSubject] = useState("");
  const [name, setName] = useState(memberName ?? "");
  const [contact, setContact] = useState(user?.email ?? "");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!subject.trim() || !content.trim()) { setErr("제목과 문의내용을 입력해 주세요."); return; }
    setBusy(true); setErr(null);
    const sb = getSupabase();
    const body = `이름: ${name || "-"}\n연락처: ${contact || "-"}\n\n${content.trim()}`;
    try {
      if (sb && firmId && user) {
        await sb.from("support_tickets").insert({ firm_id: firmId, member_id: user.id, subject: subject.trim(), body });
      }
      await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), name, contact, firm: firmName, body: content.trim() }),
      });
      setDone(true);
    } catch {
      setErr("접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  };

  const close = () => {
    setDone(false); setSubject(""); setContent(""); setErr(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="고객센터 · 문의하기"
      desc="문의를 남기시면 처리 결과를 ‘도움말 → 1:1 문의 내역’에서 확인할 수 있습니다."
      size="lg"
      footer={
        done ? (
          <Button onClick={close}>닫기</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>취소</Button>
            <Button onClick={submit} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} 접수</Button>
          </>
        )
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 size={38} className="text-success" />
          <div className="text-[15px] font-bold text-ink">문의가 접수되었습니다</div>
          <p className="text-[13px] leading-relaxed text-muted">담당자가 확인 후 처리해 드립니다.<br />처리 결과는 <b className="text-ink-soft">도움말 → 1:1 문의 내역</b>에서 확인하실 수 있습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="제목"><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="문의 제목" className={inputCls} /></Field>
          <Field label="소속" hint="로그인 정보로 자동 입력됩니다"><input value={firmName ?? "내 사무소"} readOnly className={`${inputCls} bg-surface-2 text-muted`} /></Field>
          <Field label="이름"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="담당자 이름" className={inputCls} /></Field>
          <Field label="연락처"><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="전화번호 또는 이메일" className={inputCls} /></Field>
          <Field label="문의내용">
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="문의 내용을 입력해 주세요"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
          </Field>
          {err && <p className="text-[12.5px] text-danger">{err}</p>}
        </div>
      )}
    </Modal>
  );
}
