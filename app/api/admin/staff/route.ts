import { NextResponse } from "next/server";
import { serviceClient, callerOwnerFirm, staffEmail } from "@/lib/serverSupabase";

// 단체 관리자(owner)가 직원 계정을 생성. 서비스 키 필요.
export async function POST(req: Request) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ ok: false, message: "서비스 키(SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다." }, { status: 503 });

  const ctx = await callerOwnerFirm(req);
  if (!ctx) return NextResponse.json({ ok: false, message: "관리자(대표) 권한이 필요합니다." }, { status: 403 });
  if (!ctx.firmCode) return NextResponse.json({ ok: false, message: "사무소 코드를 먼저 설정해 주세요." }, { status: 400 });

  const { usercode, name, password, phone } = await req.json().catch(() => ({}));
  const uc = String(usercode || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (uc.length < 1 || uc.length > 12) return NextResponse.json({ ok: false, message: "직원 코드는 1~12자 영문/숫자로 입력하세요." }, { status: 400 });
  if (String(password || "").length < 6) return NextResponse.json({ ok: false, message: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });

  // 좌석 확인
  const { count } = await svc.from("members").select("id", { count: "exact", head: true }).eq("firm_id", ctx.firmId);
  if ((count ?? 0) >= ctx.seats) {
    return NextResponse.json({ ok: false, message: `좌석이 부족합니다(현재 ${count}/${ctx.seats}). 좌석 수를 늘려 주세요.` }, { status: 400 });
  }

  const email = staffEmail(ctx.firmCode, uc);
  const { error } = await svc.auth.admin.createUser({
    email,
    password: String(password),
    email_confirm: true,
    user_metadata: { join_firm_id: ctx.firmId, name: name || uc, staff_code: uc, staff_role: "staff", phone: phone || null },
  });
  if (error) {
    const dup = /already|registered|exists/i.test(error.message);
    return NextResponse.json({ ok: false, message: dup ? "이미 사용 중인 아이디입니다. 다른 직원 코드를 사용하세요." : error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, loginId: `${ctx.firmCode}-${uc}` });
}
