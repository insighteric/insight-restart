import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 서버 전용. 서비스 롤 키로 Admin API 사용(계정 생성/비번/삭제). 키 없으면 null.
export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface OwnerCtx { userId: string; firmId: string; firmCode: string | null; seats: number }

// 요청자가 사무소 소유자(owner)인지 검증하고 사무소 정보 반환.
export async function callerOwnerFirm(req: Request): Promise<OwnerCtx | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authz = req.headers.get("authorization") || "";
  if (!url || !anon || !authz) return null;
  const svc = serviceClient();
  if (!svc) return null;
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authz } }, auth: { persistSession: false } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const { data: m } = await svc.from("members").select("firm_id, role").eq("id", user.id).maybeSingle();
  if (!m || m.role !== "owner") return null;
  const { data: f } = await svc.from("firms").select("code, seats").eq("id", m.firm_id as string).maybeSingle();
  return { userId: user.id, firmId: m.firm_id as string, firmCode: (f?.code as string) ?? null, seats: (f?.seats as number) ?? 1 };
}

export const STAFF_DOMAIN = "staff.insightrestart.app";
export const staffEmail = (firmCode: string, usercode: string) =>
  `${firmCode}-${usercode}`.toLowerCase().replace(/[^a-z0-9.\-_]/g, "") + "@" + STAFF_DOMAIN;
