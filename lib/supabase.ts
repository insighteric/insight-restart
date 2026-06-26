// Supabase 클라이언트 (선택적)
// 환경변수가 있으면 실제 DB 사용, 없으면 null → 앱은 localStorage 로 동작.
// 마이그레이션 시 lib/store.tsx 의 저장/조회를 이 클라이언트로 교체하면 된다.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  client = createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

export function supabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
