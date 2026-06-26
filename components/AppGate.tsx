"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "./AppShell";

export function AppGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.configured && !auth.loading && !auth.user) router.replace("/login");
  }, [auth.configured, auth.loading, auth.user, router]);

  if (auth.configured && (auth.loading || !auth.user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 animate-pulse items-center justify-center rounded-2xl bg-brand text-white">
            <Scale size={22} />
          </div>
          <div className="text-[13px] text-muted">불러오는 중…</div>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
