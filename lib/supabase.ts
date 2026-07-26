// Supabase 클라이언트 (선택적)
// 환경변수가 있으면 실제 DB 사용, 없으면 null → 앱은 localStorage 로 동작.
// 마이그레이션 시 lib/store.tsx 의 저장/조회를 이 클라이언트로 교체하면 된다.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// 토큰 잠금(navigator.locks) 안전장치.
// 기본 구현은 잠금을 얻을 때까지 무한 대기하므로, 다른 탭이 잠금을 쥔 채
// 멈추면(절전·크래시 등) getSession()·rpc() 가 영원히 응답하지 않는다.
// → 일정 시간 안에 못 얻으면 잠금 없이 진행해 화면이 멈추지 않게 한다.
async function tolerantLock<R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) return fn();

  const waitMs = acquireTimeout > 0 ? acquireTimeout : 5000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), waitMs);
  try {
    return await locks.request(name, { signal: controller.signal }, async () => fn());
  } catch (e) {
    // 잠금 획득 실패(시간 초과 등) → 잠금 없이 실행 (멈춤 방지 우선)
    if ((e as Error)?.name === "AbortError") return fn();
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  client = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, lock: tolerantLock },
  });
  return client;
}

export function supabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
