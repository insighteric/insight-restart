import { NextResponse } from "next/server";
import { serviceClient, callerOwnerFirm } from "@/lib/serverSupabase";

// 단체 관리자가 직원 계정의 비밀번호를 재설정.
export async function POST(req: Request) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ ok: false, message: "서비스 키가 설정되지 않았습니다." }, { status: 503 });
  const ctx = await callerOwnerFirm(req);
  if (!ctx) return NextResponse.json({ ok: false, message: "관리자(대표) 권한이 필요합니다." }, { status: 403 });

  const { memberId, password } = await req.json().catch(() => ({}));
  if (!memberId) return NextResponse.json({ ok: false, message: "대상이 없습니다." }, { status: 400 });
  if (String(password || "").length < 6) return NextResponse.json({ ok: false, message: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });

  // 대상이 같은 사무소 소속인지 확인
  const { data: m } = await svc.from("members").select("firm_id").eq("id", memberId).maybeSingle();
  if (!m || m.firm_id !== ctx.firmId) return NextResponse.json({ ok: false, message: "같은 사무소의 직원만 변경할 수 있습니다." }, { status: 403 });

  const { error } = await svc.auth.admin.updateUserById(memberId, { password: String(password) });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
