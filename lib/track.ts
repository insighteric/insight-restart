import { getSupabase } from "./supabase";

export type TrackType =
  | "login" | "visit"
  | "ai_document" | "analyze" | "correction" | "issue" | "doc_save" | "upload";

// auth에서 로그인/사무소 컨텍스트를 주입(추가 네트워크 호출 없이 기록)
let ctx: { firmId: string | null; userId: string | null } = { firmId: null, userId: null };
export function setTrackContext(firmId: string | null, userId: string | null) {
  ctx = { firmId, userId };
}

// 접속·사용 이벤트 기록(fire-and-forget). 비로그인/미설정이면 무시.
export function track(type: TrackType, meta?: Record<string, unknown>) {
  const sb = getSupabase();
  if (!sb || !ctx.firmId || !ctx.userId) return;
  try {
    sb.from("activity_events")
      .insert({ firm_id: ctx.firmId, member_id: ctx.userId, type, meta: meta ?? null })
      .then(() => {}, () => {});
  } catch {
    /* ignore */
  }
}
