// 알림 발송 (카카오 알림톡/친구톡 · SMS) — Solapi(솔라피) 연동
// 환경변수 미설정 시 mock 으로 동작(실제 발송 없이 성공 반환)하여 UI 흐름이 끊기지 않게 한다.
//
// 필요 환경변수:
//   SOLAPI_API_KEY, SOLAPI_API_SECRET   (계정)
//   SOLAPI_SENDER                        (발신번호, 사전 등록)
//   SOLAPI_PF_ID, SOLAPI_TEMPLATE_ID     (알림톡 발신프로필/템플릿 — 선택)

import crypto from "crypto";

export function notifyEnabled(): boolean {
  return !!(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SOLAPI_SENDER);
}

export type NotifyChannel = "kakao" | "sms";

export interface NotifyRequest {
  to: string; // 수신 휴대폰
  text: string; // 본문(알림톡은 템플릿과 일치해야 함)
  channel?: NotifyChannel;
  variables?: Record<string, string>; // 알림톡 치환변수 #{name}
}

function authHeader(): string {
  const apiKey = process.env.SOLAPI_API_KEY!;
  const apiSecret = process.env.SOLAPI_API_SECRET!;
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString("hex");
  const signature = crypto.createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export async function sendNotification(req: NotifyRequest): Promise<{ ok: boolean; mock?: boolean; id?: string; error?: string }> {
  if (!notifyEnabled()) {
    // 연동 전: 실제 발송 없이 성공 처리(데모/개발용)
    console.info("[notify mock]", req.channel ?? "kakao", req.to, req.text.slice(0, 40));
    return { ok: true, mock: true };
  }

  const useKakao =
    (req.channel ?? "kakao") === "kakao" && process.env.SOLAPI_PF_ID && process.env.SOLAPI_TEMPLATE_ID;

  const message: Record<string, unknown> = {
    to: req.to.replace(/[^0-9]/g, ""),
    from: process.env.SOLAPI_SENDER,
    text: req.text,
    type: useKakao ? "ATA" : "LMS",
  };
  if (useKakao) {
    message.kakaoOptions = {
      pfId: process.env.SOLAPI_PF_ID,
      templateId: process.env.SOLAPI_TEMPLATE_ID,
      variables: req.variables ?? {},
      disableSms: false, // 실패 시 문자 대체발송
    };
  }

  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.errorMessage || "발송 실패" };
    return { ok: true, id: data?.messageId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
