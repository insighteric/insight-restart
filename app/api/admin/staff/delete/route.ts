import { NextResponse } from "next/server";
import { serviceClient, callerOwnerFirm } from "@/lib/serverSupabase";

// 단체 관리자가 직원 계정을 삭제.
export async function POST(req: Request) {
  const svc = serviceClient();
  if (!svc) return NextResponse.json({ ok: false, message: "서비스 키가 설정되지 않았습니다." }, { status: 503 });
  const ctx = await callerOwnerFirm(req);
  if (!ctx) return NextResponse.json({ ok: false, message: "관리자(대표) 권한이 필요합니다." }, { status: 403 });

  const { memberId } = await req.json().catch(() => ({}));
  if (!memberId) return NextResponse.json({ ok: false, message: "대상이 없습니다." }, { status: 400 });
  if (memberId === ctx.userId) return NextResponse.json({ ok: false, message: "본인 계정은 삭제할 수 없습니다." }, { status: 400 });

  const { data: m } = await svc.from("members").select("firm_id, role").eq("id", memberId).maybeSingle();
  if (!m || m.firm_id !== ctx.firmId) return NextResponse.json({ ok: false, message: "같은 사무소의 직원만 삭제할 수 있습니다." }, { status: 403 });
  if (m.role === "owner") return NextResponse.json({ ok: false, message: "대표 계정은 삭제할 수 없습니다." }, { status: 400 });

  await svc.from("members").delete().eq("id", memberId);
  await svc.auth.admin.deleteUser(memberId);
  return NextResponse.json({ ok: true });
}
