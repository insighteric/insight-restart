import { supabaseConfigured } from "@/lib/supabase";
import { tossEnabled } from "@/lib/payments";
import { notifyEnabled } from "@/lib/notify";
import { aiEnabled } from "@/lib/ai";
import { codefEnabled } from "@/lib/codef";

// 연동 상태(불리언만 노출, 시크릿은 노출하지 않음)
export async function GET() {
  return Response.json({
    supabase: supabaseConfigured(),
    toss: tossEnabled(),
    kakao: notifyEnabled(),
    ai: aiEnabled(),
    codef: codefEnabled(),
  });
}
