import { NextResponse } from "next/server";
import { serviceClient, callerSuperAdmin } from "@/lib/serverSupabase";

// 플랫폼 운영자가 임의 회원의 비밀번호를 직접 지정.
// 재설정 메일을 받지 못하거나 비밀번호를 분실한 가입자를 즉시 복구하기 위한 용도.
export async function POST(req: Request) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ ok: false, message: "서비스 키가 설정되지 않았습니다." }, { status: 503 });

  const caller = await callerSuperAdmin(req);
  if (!caller) return NextResponse.json({ ok: false, message: "플랫폼 운영자 권한이 필요합니다." }, { status: 403 });

  const { memberId, password } = await req.json().catch(() => ({}));
  if (!memberId) return NextResponse.json({ ok: false, message: "대상이 없습니다." }, { status: 400 });
  if (String(password || "").length < 6) {
    return NextResponse.json({ ok: false, message: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
  }

  // 대상이 실제 가입자인지 확인
  const { data: m } = await svc.from("members").select("id, email").eq("id", memberId).maybeSingle();
  if (!m) return NextResponse.json({ ok: false, message: "가입자를 찾을 수 없습니다." }, { status: 404 });

  const { error } = await svc.auth.admin.updateUserById(String(memberId), {
    password: String(password),
    email_confirm: true, // 메일 인증 전 계정도 즉시 로그인 가능하도록
  });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, email: m.email });
}
