"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scale, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firm, setFirm] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.loading && auth.user) router.replace("/dashboard");
  }, [auth.loading, auth.user, router]);

  // Supabase 미설정 시: 데모 모드로 바로 입장
  useEffect(() => {
    if (!auth.loading && !auth.configured) router.replace("/dashboard");
  }, [auth.loading, auth.configured, router]);

  const submit = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await auth.signIn(email.trim(), password);
        if (error) setError(translate(error));
        else router.replace("/dashboard");
      } else {
        if (!firm.trim() || !name.trim()) {
          setError("사무소명과 이름을 입력해주세요.");
          return;
        }
        const { error } = await auth.signUp(email.trim(), password, firm.trim(), name.trim());
        if (error) setError(translate(error));
        else {
          // 자동 로그인 시도(이메일 확인이 꺼져 있으면 즉시 입장)
          const r = await auth.signIn(email.trim(), password);
          if (r.error) setNotice("가입 완료! 이메일 인증 후 로그인해주세요.");
          else router.replace("/dashboard");
        }
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
            <div className="text-[12px] text-muted">개인회생·파산 AI 실무 플랫폼</div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5 flex rounded-lg border border-line bg-surface-2 p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                  mode === m ? "bg-surface text-brand-700 shadow-[var(--shadow-card)]" : "text-muted"
                }`}
              >
                {m === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {mode === "signup" && (
              <>
                <Field label="사무소명">
                  <Input value={firm} onChange={(e) => setFirm(e.target.value)} placeholder="예: 신안법률사무소" />
                </Field>
                <Field label="담당자 이름">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
                </Field>
              </>
            )}
            <Field label="이메일">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@firm.com" />
            </Field>
            <Field label="비밀번호" hint={mode === "signup" ? "6자 이상" : undefined}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </Field>

            {error && <div className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{error}</div>}
            {notice && <div className="rounded-lg bg-info-bg px-3 py-2 text-[13px] text-info">{notice}</div>}

            <Button className="w-full" size="lg" onClick={submit} disabled={busy || !email || !password}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {mode === "login" ? "로그인" : "회원가입하고 시작"}
            </Button>
          </div>
        </div>

        <p className="mt-4 text-center text-[12px] text-faint">
          {auth.configured ? "Supabase 인증으로 보호됩니다." : "데모 모드(로컬)로 실행 중입니다."}
        </p>
      </div>
    </div>
  );
}

function translate(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/Email not confirmed/i.test(msg)) return "이메일 인증이 필요합니다. 메일함을 확인해주세요.";
  if (/User already registered/i.test(msg)) return "이미 가입된 이메일입니다.";
  if (/Password should be/i.test(msg)) return "비밀번호는 6자 이상이어야 합니다.";
  return msg;
}
