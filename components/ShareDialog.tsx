"use client";

import { useState } from "react";
import { MessageCircle, Mail, MessageSquare, Copy, Check, Send, Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./ui";

export function ShareDialog({
  open,
  onClose,
  title = "의뢰인에게 공유",
  subject,
  body,
  toEmail,
  toPhone,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subject?: string;
  body: string;
  toEmail?: string;
  toPhone?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const sendAlimtalk = async () => {
    if (!toPhone) {
      setSendResult("수신 번호가 없습니다.");
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: toPhone, text: body, channel: "kakao" }),
      });
      const data = await res.json();
      if (data.ok && data.mock) setSendResult("연동 전(데모): 실제 발송은 카카오/솔라피 연동 후 가능합니다.");
      else if (data.ok) setSendResult("알림톡을 발송했습니다.");
      else setSendResult(data.error || "발송 실패");
    } catch {
      setSendResult("발송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const openKakao = async () => {
    // 카카오 비즈니스/알림톡 연동 전까지는: 본문 복사 후 카카오톡 실행을 시도.
    await copy();
    // 모바일에서는 kakaotalk 스킴, 데스크톱에서는 카카오톡 PC/웹으로 폴백.
    const win = window.open("kakaotalk://", "_blank");
    if (!win) window.open("https://web.kakao.com", "_blank");
  };

  const openEmail = () => {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    params.set("body", body);
    window.location.href = `mailto:${toEmail ?? ""}?${params.toString()}`;
  };

  const openSms = () => {
    const sep = /iphone|ipad|ipod|mac/i.test(navigator.userAgent) ? "&" : "?";
    window.location.href = `sms:${toPhone ?? ""}${sep}body=${encodeURIComponent(body)}`;
  };

  return (
    <Modal open={open} onClose={onClose} title={title} desc="채널을 선택해 안내문을 전달하세요." size="lg">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ChannelBtn
          onClick={openKakao}
          icon={<MessageCircle size={20} />}
          label="카카오톡"
          className="bg-[#FEE500] text-[#3C1E1E]"
        />
        <ChannelBtn onClick={openEmail} icon={<Mail size={20} />} label="이메일" className="bg-brand-50 text-brand-700" />
        <ChannelBtn onClick={openSms} icon={<MessageSquare size={20} />} label="문자(SMS)" className="bg-success-bg text-success" />
        <ChannelBtn
          onClick={copy}
          icon={copied ? <Check size={20} /> : <Copy size={20} />}
          label={copied ? "복사됨" : "복사"}
          className="bg-surface-2 text-ink-soft"
        />
      </div>

      <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[13px]">
            <div className="font-semibold text-brand-700">카카오 알림톡 자동발송</div>
            <div className="text-[12px] text-muted">{toPhone ? `수신: ${toPhone}` : "수신 번호 없음"}</div>
          </div>
          <Button size="sm" onClick={sendAlimtalk} disabled={sending || !toPhone}>
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 발송
          </Button>
        </div>
        {sendResult && <div className="mt-2 text-[12px] font-medium text-brand-ink">{sendResult}</div>}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-[13px] font-medium text-ink-soft">미리보기</div>
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-4 text-[13px] leading-relaxed text-ink-soft">
{body}
        </pre>
      </div>

      <p className="mt-3 text-[11px] text-faint">
        ※ 카카오 알림톡 자동발송은 카카오 비즈니스 채널 연동 시 1:1 자동 전송으로 전환됩니다(설정 → 연동).
      </p>

      <div className="mt-4 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          닫기
        </Button>
      </div>
    </Modal>
  );
}

function ChannelBtn({
  onClick,
  icon,
  label,
  className,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-4 text-[13px] font-semibold transition-transform hover:scale-[1.02] active:scale-95 ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}
