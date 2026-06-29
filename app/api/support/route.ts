import { NextResponse } from "next/server";

const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

// 고객센터 문의 접수 → 지정 메일로 발송. 제목 앞에 [Insight Restart] 자동.
// RESEND_API_KEY 미설정 시 메일은 생략(문의는 support_tickets에 저장돼 운영자가 확인).
export async function POST(req: Request) {
  const { subject, name, contact, firm, body } = await req.json().catch(() => ({}));
  if (!String(subject || "").trim() && !String(body || "").trim()) {
    return NextResponse.json({ ok: false, message: "내용을 입력하세요." }, { status: 400 });
  }
  const key = process.env.RESEND_API_KEY;
  const to = process.env.SUPPORT_TO || "insightsimplit@gmail.com";
  const from = process.env.SUPPORT_FROM || "Insight Restart <onboarding@resend.dev>";
  if (!key) return NextResponse.json({ ok: true, emailed: false });

  try {
    const html =
      `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:640px">` +
      `<h3 style="margin:0 0 12px">고객센터 문의 — ${escapeHtml(subject) || "(제목 없음)"}</h3>` +
      `<table style="border-collapse:collapse;font-size:14px">` +
      `<tr><td style="padding:4px 12px 4px 0;color:#888">소속</td><td>${escapeHtml(firm) || "-"}</td></tr>` +
      `<tr><td style="padding:4px 12px 4px 0;color:#888">이름</td><td>${escapeHtml(name) || "-"}</td></tr>` +
      `<tr><td style="padding:4px 12px 4px 0;color:#888">연락처</td><td>${escapeHtml(contact) || "-"}</td></tr>` +
      `</table>` +
      `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #eee;white-space:pre-wrap;font-size:14px;line-height:1.7">${escapeHtml(body)}</div>` +
      `</div>`;
    const payload: Record<string, unknown> = {
      from,
      to,
      subject: `[Insight Restart] ${String(subject || "문의").trim()}`,
      html,
    };
    if (typeof contact === "string" && contact.includes("@")) payload.reply_to = contact.trim();

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return NextResponse.json({ ok: true, emailed: false, message: (j as { message?: string })?.message });
    }
    return NextResponse.json({ ok: true, emailed: true });
  } catch {
    return NextResponse.json({ ok: true, emailed: false });
  }
}
