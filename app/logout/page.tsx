"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

// 주소창에 /logout 으로 직접 접근해도 확실히 로그아웃되는 탈출구.
export default function LogoutPage() {
  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      try {
        await Promise.race([
          sb?.auth.signOut().then(() => {}) ?? Promise.resolve(),
          new Promise((r) => setTimeout(r, 1500)),
        ]);
      } catch {
        /* ignore */
      }
      try {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k);
        });
      } catch {
        /* ignore */
      }
      window.location.href = "/login";
    })();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex items-center gap-2 text-muted">
        <Loader2 size={18} className="animate-spin" /> 로그아웃 중…
      </div>
    </div>
  );
}
