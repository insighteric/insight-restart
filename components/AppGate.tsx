"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, XCircle, LogOut } from "lucide-react";
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

  // 단체(회사) 가입 — 운영자 승인 전/거절 시 게이트 (운영자 본인은 통과)
  if (auth.configured && auth.user && !auth.superAdmin && (auth.firmStatus === "pending" || auth.firmStatus === "rejected")) {
    const rejected = auth.firmStatus === "rejected";
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-[var(--shadow-card)]">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${rejected ? "bg-danger-bg text-danger" : "bg-brand-50 text-brand-700"}`}>
            {rejected ? <XCircle size={28} /> : <Clock size={28} />}
          </div>
          <h1 className="text-lg font-bold text-ink">{rejected ? "가입이 반려되었습니다" : "가입 승인 대기 중"}</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            {rejected ? (
              <>단체(회사) 가입 신청이 반려되었습니다.<br />자세한 사항은 고객센터로 문의해 주세요.</>
            ) : (
              <><b className="text-ink">{auth.firmName}</b> 단체(회사) 가입 신청이 접수되었습니다.<br />운영자 승인 후 모든 기능을 이용하실 수 있습니다. 승인되면 다시 로그인해 주세요.</>
            )}
          </p>
          <button
            onClick={() => auth.signOut()}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-[13px] font-semibold text-muted hover:bg-surface-2 hover:text-ink"
          >
            <LogOut size={15} /> 로그아웃
          </button>
          <p className="mt-4 text-[12px] text-faint">문의: Insight Restart 고객센터</p>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
