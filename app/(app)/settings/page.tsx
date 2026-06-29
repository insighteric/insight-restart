"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, MessageCircle, KeyRound, RotateCcw, Building2, Database, CreditCard, Loader2, Lock, LogOut, Stamp } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Button, Badge, Field, Input } from "@/components/ui";
import { won } from "@/lib/format";
import { fetchPlatformBaseline } from "@/lib/platformSettings";
import type { PlanTier } from "@/lib/types";

interface IntegrationStatus {
  supabase: boolean;
  toss: boolean;
  kakao: boolean;
  ai: boolean;
  codef: boolean;
}

const PLANS: { tier: PlanTier; name: string; price: string; per: string; features: string[]; highlight?: boolean }[] = [
  {
    tier: "free",
    name: "Free",
    price: "0",
    per: "체험",
    features: ["사건 5건", "계산기·거래내역 분석", "보정명령 AI 월 5회"],
  },
  {
    tier: "pro",
    name: "Pro",
    price: "59,000",
    per: "월 / 1인",
    highlight: true,
    features: ["사건 무제한", "AI 보정·서류작성 월 500회", "카톡·이메일 공유", "일정 자동 알림"],
  },
  {
    tier: "team",
    name: "Team",
    price: "149,000",
    per: "월 / 3인",
    features: ["Pro 전체 기능", "팀 공유·권한 관리", "카카오 알림톡 자동발송", "전담 지원"],
  },
];

export default function SettingsPage() {
  const store = useStore();
  const auth = useAuth();
  const { settings, subscription } = store;
  const [firmName, setFirmName] = useState(settings.firmName);
  const [ratio, setRatio] = useState(settings.livingCostRatio * 100);
  const [table, setTable] = useState(settings.medianIncomeByHousehold);
  const [savedMsg, setSavedMsg] = useState(false);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [billing, setBilling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ supabase: false, toss: false, kakao: false, ai: false, codef: false }));
  }, []);

  const startBilling = async () => {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      setBilling("토스 클라이언트 키(NEXT_PUBLIC_TOSS_CLIENT_KEY)를 설정하면 카드 등록·정기결제가 활성화됩니다.");
      return;
    }
    try {
      if (!(window as unknown as { TossPayments?: unknown }).TossPayments) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://js.tosspayments.com/v1/payment";
          s.onload = () => res();
          s.onerror = () => rej();
          document.head.appendChild(s);
        });
      }
      const TossPayments = (window as unknown as { TossPayments: (k: string) => { requestBillingAuth: (m: string, o: Record<string, string>) => Promise<void> } }).TossPayments;
      const tp = TossPayments(clientKey);
      const customerKey = `firm_${Date.now().toString(36)}`;
      await tp.requestBillingAuth("카드", {
        customerKey,
        successUrl: window.location.origin + "/settings?billing=success",
        failUrl: window.location.origin + "/settings?billing=fail",
      });
    } catch {
      setBilling("결제창을 여는 중 문제가 발생했습니다.");
    }
  };

  const saveSettings = () => {
    store.updateSettings({
      firmName,
      livingCostRatio: ratio / 100,
      medianIncomeByHousehold: table,
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const [applyMsg, setApplyMsg] = useState<string | null>(null);
  const applyBaseline = async () => {
    const b = await fetchPlatformBaseline();
    if (!b) { setApplyMsg("운영자 권장값을 불러올 수 없습니다."); return; }
    setRatio(Math.round((b.livingCostRatio ?? 0.6) * 100));
    setTable(b.medianIncomeByHousehold ?? table);
    store.updateSettings({ livingCostRatio: b.livingCostRatio, medianIncomeByHousehold: b.medianIncomeByHousehold, baseYear: b.baseYear });
    setApplyMsg(`운영자 권장 기준값(${b.baseYear}년)을 적용했습니다.`);
    setTimeout(() => setApplyMsg(null), 3000);
  };

  return (
    <div>
      <PageHeader title="설정·구독" desc="요금제, 사무소 정보, 기준값, 연동을 관리합니다." />

      {/* 구독 */}
      <div className="mb-6">
        <h2 className="mb-3 text-[15px] font-bold text-ink">구독 플랜</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {PLANS.map((p) => {
            const current = subscription.tier === p.tier;
            return (
              <Card
                key={p.tier}
                className={`relative p-5 ${p.highlight ? "ring-2 ring-brand" : ""}`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold text-white">
                    인기
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-bold text-ink">{p.name}</span>
                  {current && <Badge tone="success"><Check size={11} /> 사용중</Badge>}
                </div>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-2xl font-extrabold text-ink">₩{p.price}</span>
                  <span className="mb-1 text-xs text-muted">{p.per}</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-ink-soft">
                      <Check size={15} className="mt-0.5 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={current ? "secondary" : p.highlight ? "primary" : "secondary"}
                  className="mt-4 w-full"
                  disabled={current}
                  onClick={p.tier === "free" ? undefined : startBilling}
                >
                  {current ? "현재 플랜" : p.tier === "free" ? "이 플랜 선택" : "카드 등록·구독"}
                </Button>
              </Card>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-faint">
            현재 {subscription.tier.toUpperCase()} · AI 크레딧 {subscription.aiCreditsUsed}/{subscription.aiCreditsLimit} 사용 · {subscription.seats}석
          </p>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
            <CreditCard size={13} /> 정기결제: 토스페이먼츠 {status?.toss ? "연동됨" : "연동 전(테스트 키 입력 시 활성화)"}
          </span>
        </div>
        {billing && <p className="mt-1 text-[12px] font-medium text-brand">{billing}</p>}
      </div>

      {/* 저장 용량 */}
      <Card className="mb-4">
        <CardHeader title="저장 용량" desc="사건 ‘첨부 서류’에 업로드한 파일의 사용량입니다." action={<Database size={16} className="text-faint" />} />
        <div className="p-5">
          {(() => {
            const uploads = store.uploads ?? [];
            const used = uploads.reduce((s, u) => s + (u.size || 0), 0);
            const tier = subscription.tier;
            const quotaGB = tier === "team" ? 50 : tier === "pro" ? 10 : 1;
            const quota = quotaGB * 1024 * 1024 * 1024;
            const pct = Math.min(100, (used / quota) * 100);
            const fmt = (b: number) => (b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : b < 1024 * 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`);
            return (
              <>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="font-semibold text-ink">{fmt(used)} <span className="text-faint">/ {quotaGB}GB</span></span>
                  <span className="text-muted">{uploads.length}개 파일</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${pct > 90 ? "bg-danger" : "bg-brand"}`} style={{ width: `${pct}%` }} /></div>
                <p className="mt-2 text-[11.5px] text-faint">{tier.toUpperCase()} 플랜 기준 {quotaGB}GB 제공. 용량이 부족하면 플랜을 업그레이드하세요.</p>
              </>
            );
          })()}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 사무소 + 기준값 */}
        <Card>
          <CardHeader title="사무소 · 기준값" desc="기준 중위소득은 매년 고시값으로 갱신하세요." action={<Building2 size={16} className="text-faint" />} />
          <div className="space-y-4 p-5">
            <Field label="사무소명">
              <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} />
            </Field>
            <Field label="생계비 인정 비율 (기준 중위소득 대비 %)" hint="통상 60%">
              <Input type="number" value={ratio} onChange={(e) => setRatio(Number(e.target.value))} />
            </Field>
            <div>
              <div className="mb-2 text-[13px] font-medium text-ink-soft">기준 중위소득 (월, 가구원수별)</div>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4, 5, 6].map((h) => (
                  <div key={h} className="flex items-center gap-2">
                    <span className="w-9 text-[13px] text-muted">{h}인</span>
                    <Input
                      type="number"
                      value={table[h] ?? 0}
                      onChange={(e) => setTable({ ...table, [h]: Number(e.target.value) })}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-faint">예: 1인 {won(table[1] ?? 0)} → 생계비 {won(Math.round((table[1] ?? 0) * (ratio / 100)))}</p>
              <button onClick={applyBaseline} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50">
                <RotateCcw size={13} /> 운영자 권장값 적용
              </button>
              {applyMsg && <p className="mt-1.5 text-[12px] text-success">{applyMsg}</p>}
            </div>
            {auth.isAdmin && (
              <label className="flex items-start gap-2.5 rounded-lg border border-line-soft p-3">
                <input type="checkbox" checked={!!settings.staffSeeAssignedOnly} onChange={(e) => store.updateSettings({ staffSeeAssignedOnly: e.target.checked })} className="mt-0.5 accent-[var(--color-brand)]" />
                <div>
                  <div className="text-[13px] font-medium text-ink">직원은 담당 사건만 표시</div>
                  <div className="text-[11.5px] text-muted">직원(비관리자)의 사건 목록을 본인 담당 사건으로 제한합니다. ※ 화면 표시 필터이며 데이터 접근을 완전히 차단하지는 않습니다.</div>
                </div>
              </label>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    if (confirm("모든 사건·의뢰인·서류 데이터를 삭제하고 빈 사무소로 만들까요? (실사용 시작용 · 되돌릴 수 없음)")) store.clearData();
                  }}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-danger hover:underline"
                >
                  <RotateCcw size={14} /> 전체 데이터 비우기(실사용 시작)
                </button>
                <button
                  onClick={() => {
                    if (confirm("샘플(데모) 데이터를 다시 채울까요? 현재 데이터가 덮어써집니다.")) store.reset();
                  }}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:underline"
                >
                  샘플 데이터 채우기
                </button>
              </div>
              <Button onClick={saveSettings}>{savedMsg ? <Check size={15} /> : null} {savedMsg ? "저장됨" : "저장"}</Button>
            </div>
          </div>
        </Card>

        {/* 연동 */}
        <Card>
          <CardHeader title="연동" desc="채널을 연결하면 안내·알림을 자동 발송합니다." action={<Sparkles size={16} className="text-brand" />} />
          <div className="divide-y divide-line-soft">
            <IntegrationRow
              icon={<MessageCircle size={18} className="text-[#9c7a00]" />}
              name="카카오 알림톡 (솔라피)"
              desc="보정·일정 안내를 1:1 자동 전송"
              on={status?.kakao}
              env="SOLAPI_API_KEY"
            />
            <IntegrationRow
              icon={<Database size={18} className="text-success" />}
              name="Supabase (DB·인증)"
              desc="멀티 사무소·팀 공유·영구 저장"
              on={status?.supabase}
              env="NEXT_PUBLIC_SUPABASE_URL"
            />
            <IntegrationRow
              icon={<CreditCard size={18} className="text-brand" />}
              name="토스페이먼츠 (정기결제)"
              desc="구독 카드 등록·자동 결제"
              on={status?.toss}
              env="TOSS_SECRET_KEY"
            />
            <IntegrationRow
              icon={<KeyRound size={18} className="text-ink-soft" />}
              name="Anthropic API (AI)"
              desc="보정·서류 AI 품질 향상 (미설정 시 규칙기반)"
              on={status?.ai}
              env="ANTHROPIC_API_KEY"
            />
            <IntegrationRow
              icon={<Stamp size={18} className="text-brand-700" />}
              name="CODEF (공공서류 자동발급)"
              desc="정부24·홈택스·대법원·4대보험 자동발급 (미설정 시 목업)"
              on={status?.codef}
              env="CODEF_CLIENT_ID"
            />
          </div>
          <div className="border-t border-line-soft p-4 text-[12px] text-muted">
            <p className="font-semibold text-ink-soft">연동 방법</p>
            <p className="mt-1">
              프로젝트 루트 <code className="rounded bg-surface-2 px-1">.env.local</code> 에 각 키를 설정하면
              자동으로 활성화됩니다(<code className="rounded bg-surface-2 px-1">.env.example</code> 참고). Supabase 스키마는
              <code className="mx-1 rounded bg-surface-2 px-1">supabase/schema.sql</code> 로 적용합니다. 미설정 시에도 전 기능이 로컬·규칙기반으로 동작합니다.
            </p>
          </div>
        </Card>
      </div>

      {/* 계정 */}
      {auth.configured && auth.user && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <AccountCard />
        </div>
      )}
    </div>
  );
}

function AccountCard() {
  const auth = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    setDone(false);
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
        setPw("");
        setPw2("");
        setTimeout(() => setDone(false), 3000);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="계정 · 비밀번호" desc="로그인 비밀번호를 변경합니다." action={<Lock size={16} className="text-faint" />} />
      <div className="space-y-4 p-5">
        <div className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-ink-soft">
          로그인 계정: <span className="font-medium text-ink">{auth.user?.email}</span>
        </div>
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
        {done && <div className="rounded-lg bg-success-bg px-3 py-2 text-[13px] text-success">비밀번호가 변경되었습니다.</div>}

        <div className="flex items-center justify-between">
          <button
            onClick={() => auth.signOut()}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink hover:underline"
          >
            <LogOut size={14} /> 로그아웃
          </button>
          <Button onClick={submit} disabled={busy || !pw || !pw2}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
            비밀번호 변경
          </Button>
        </div>
      </div>
    </Card>
  );
}

function IntegrationRow({ icon, name, desc, on, env }: { icon: React.ReactNode; name: string; desc: string; on?: boolean; env: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink">{name}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      {on === undefined ? (
        <Badge tone="muted"><Loader2 size={11} className="animate-spin" /> 확인중</Badge>
      ) : on ? (
        <Badge tone="success"><Check size={11} /> 연동됨</Badge>
      ) : (
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-faint">{env}</code>
      )}
    </div>
  );
}
