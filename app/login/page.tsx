"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scale, Loader2, Sparkles, ArrowLeft, Mail, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";

type Mode = "login" | "signup" | "findId" | "resetPw";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firm, setFirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 아이디 찾기 전용
  const [findName, setFindName] = useState("");
  const [findPhone, setFindPhone] = useState("");
  const [foundEmail, setFoundEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.loading && auth.user) router.replace("/dashboard");
  }, [auth.loading, auth.user, router]);

  // Supabase 미설정 시: 데모 모드로 바로 입장
  useEffect(() => {
    if (!auth.loading && !auth.configured) router.replace("/dashboard");
  }, [auth.loading, auth.configured, router]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
    setFoundEmail(null);
  };

  const submit = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await auth.signIn(email.trim(), password);
        if (error) setError(translate(error));
        else router.replace("/dashboard");
      } else if (mode === "signup") {
        if (!firm.trim() || !name.trim()) {
          setError("사무소명과 이름을 입력해주세요.");
          return;
        }
        if (!phone.trim()) {
          setError("전화번호를 입력해주세요. (아이디 찾기에 사용됩니다)");
          return;
        }
        const { error } = await auth.signUp(email.trim(), password, firm.trim(), name.trim(), phone.trim());
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

  const doFindId = async () => {
    setError(null);
    setNotice(null);
    setFoundEmail(null);
    if (!findName.trim() || !findPhone.trim()) {
      setError("이름과 전화번호를 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const { email: found, error } = await auth.findEmail(findName.trim(), findPhone.trim());
      if (error) setError(translate(error));
      else if (found) setFoundEmail(found);
      else setError("일치하는 계정을 찾을 수 없습니다. 이름·전화번호를 확인해주세요.");
    } finally {
      setBusy(false);
    }
  };

  const doResetPw = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await auth.resetPassword(email.trim());
      if (error) setError(translate(error));
      else setNotice("재설정 링크를 이메일로 보냈습니다. 메일함(스팸함 포함)을 확인해주세요.");
    } finally {
      setBusy(false);
    }
  };

  const title: Record<Mode, string> = {
    login: "로그인",
    signup: "회원가입",
    findId: "아이디(이메일) 찾기",
    resetPw: "비밀번호 찾기",
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
          {/* 로그인/회원가입 탭 */}
          {(mode === "login" || mode === "signup") && (
            <div className="mb-5 flex rounded-lg border border-line bg-surface-2 p-1">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                    mode === m ? "bg-surface text-brand-700 shadow-[var(--shadow-card)]" : "text-muted"
                  }`}
                >
                  {m === "login" ? "로그인" : "회원가입"}
                </button>
              ))}
            </div>
          )}

          {/* 찾기 모드 헤더 */}
          {(mode === "findId" || mode === "resetPw") && (
            <button
              onClick={() => switchMode("login")}
              className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
            >
              <ArrowLeft size={15} /> 로그인으로
            </button>
          )}

          {(mode === "findId" || mode === "resetPw") && (
            <h2 className="mb-4 text-[15px] font-bold text-ink">{title[mode]}</h2>
          )}

          {/* ── 로그인 / 회원가입 ── */}
          {(mode === "login" || mode === "signup") && (
            <div className="space-y-3">
              {mode === "signup" && (
                <>
                  <Field label="사무소명">
                    <Input value={firm} onChange={(e) => setFirm(e.target.value)} placeholder="예: 신안법률사무소" />
                  </Field>
                  <Field label="담당자 이름">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
                  </Field>
                  <Field label="전화번호" hint="아이디 찾기에 사용됩니다">
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010-1234-5678"
                    />
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

              {mode === "login" && (
                <div className="flex items-center justify-center gap-2 pt-1 text-[13px] text-muted">
                  <button onClick={() => switchMode("findId")} className="hover:text-ink hover:underline">
                    아이디 찾기
                  </button>
                  <span className="text-faint">·</span>
                  <button onClick={() => switchMode("resetPw")} className="hover:text-ink hover:underline">
                    비밀번호 찾기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── 아이디 찾기 ── */}
          {mode === "findId" && (
            <div className="space-y-3">
              <p className="text-[13px] text-muted">가입 시 입력한 이름과 전화번호로 이메일을 찾습니다.</p>
              <Field label="이름">
                <Input value={findName} onChange={(e) => setFindName(e.target.value)} placeholder="홍길동" />
              </Field>
              <Field label="전화번호">
                <Input
                  type="tel"
                  value={findPhone}
                  onChange={(e) => setFindPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  onKeyDown={(e) => e.key === "Enter" && doFindId()}
                />
              </Field>

              {error && <div className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{error}</div>}
              {foundEmail && (
                <div className="rounded-lg bg-success-bg px-3 py-2.5 text-[13px] text-success">
                  <div className="flex items-center gap-1.5">
                    <Mail size={14} /> 회원님의 이메일
                  </div>
                  <div className="mt-1 font-bold tracking-wide text-ink">{foundEmail}</div>
                </div>
              )}

              {foundEmail ? (
                <Button className="w-full" size="lg" variant="secondary" onClick={() => switchMode("login")}>
                  로그인하러 가기
                </Button>
              ) : (
                <Button className="w-full" size="lg" onClick={doFindId} disabled={busy || !findName || !findPhone}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  이메일 찾기
                </Button>
              )}
            </div>
          )}

          {/* ── 비밀번호 찾기 ── */}
          {mode === "resetPw" && (
            <div className="space-y-3">
              <p className="text-[13px] text-muted">가입한 이메일로 비밀번호 재설정 링크를 보내드립니다.</p>
              <Field label="이메일">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@firm.com"
                  onKeyDown={(e) => e.key === "Enter" && doResetPw()}
                />
              </Field>

              {error && <div className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{error}</div>}
              {notice && <div className="rounded-lg bg-success-bg px-3 py-2 text-[13px] text-success">{notice}</div>}

              <Button className="w-full" size="lg" onClick={doResetPw} disabled={busy || !email}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                재설정 메일 보내기
              </Button>
            </div>
          )}
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
  if (/rate limit|too many/i.test(msg)) return "요청이 많습니다. 잠시 후 다시 시도해주세요.";
  return msg;
}
