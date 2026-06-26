"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scale, Loader2, KeyRound, Check, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";

export default function ResetPasswordPage() {
  const auth = useAuth();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Supabase 미설정 시 데모로 회피
  useEffect(() => {
    if (!auth.loading && !auth.configured) router.replace("/dashboard");
  }, [auth.loading, auth.configured, router]);

  const ready = auth.configured && !auth.loading && !!auth.user;

  const submit = async () => {
    setError(null);
    if (pw.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (pw !== pw2) {
      setError("두 비밀번호가 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await auth.updatePassword(pw);
      if (error) {
        setError(/should be at least|Password/i.test(error) ? "비밀번호는 6자 이상이어야 합니다." : error);
      } else {
        setDone(true);
        // 재설정 세션 정리 후 로그인 화면으로
        await auth.signOut();
        setTimeout(() => router.replace("/login"), 1800);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
            <Scale size={24} />
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight text-ink">회생ON</div>
            <div className="text-[12px] text-muted">비밀번호 재설정</div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
                <Check size={24} />
              </div>
              <div className="text-[15px] font-bold text-ink">비밀번호가 변경되었습니다</div>
              <div className="text-[13px] text-muted">잠시 후 로그인 화면으로 이동합니다…</div>
            </div>
          ) : auth.loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted">
              <Loader2 size={18} className="animate-spin" /> 확인 중…
            </div>
          ) : ready ? (
            <div className="space-y-3">
              <h2 className="mb-1 text-[15px] font-bold text-ink">새 비밀번호 설정</h2>
              <Field label="새 비밀번호" hint="6자 이상">
                <Input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="새 비밀번호 확인">
                <Input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </Field>
              {error && <div className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{error}</div>}
              <Button className="w-full" size="lg" onClick={submit} disabled={busy || !pw || !pw2}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                비밀번호 변경
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2 text-center">
              <p className="text-[13px] text-muted">
                재설정 링크가 만료되었거나 유효하지 않습니다. 비밀번호 찾기를 다시 시도해주세요.
              </p>
              <Button className="w-full" variant="secondary" onClick={() => router.replace("/login")}>
                <ArrowLeft size={15} /> 로그인으로
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
