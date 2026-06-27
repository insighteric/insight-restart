"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
        <div className="flex flex-col items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Insight Restart" className="h-52 w-52 animate-pulse rounded-[2rem]" />
          <div className="text-[14px] text-muted">불러오는 중…</div>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
