"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, Users, BarChart3, Wallet, Lock, ChevronRight, Printer, Loader2,
  UserCheck, Crown, Pause, Play, Gift, CalendarPlus, TrendingUp, Megaphone, ClipboardCheck, Activity,
  Building2, Check, X, SlidersHorizontal, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Badge, Stat, Button, EmptyState, Field, Input } from "@/components/ui";
import { useAdminAnnouncements } from "@/lib/announcements";
import { fetchPlatformBaseline, savePlatformBaseline, type PlatformBaseline } from "@/lib/platformSettings";
import { won, formatDate } from "@/lib/format";

export default function AdminPage() {
  const { superAdmin, can, isAdmin } = useAuth();
  if (superAdmin) return <OperatorConsole />;
  const anyAdmin = isAdmin || can("members") || can("dashboard") || can("payments");
  if (!anyAdmin) {
    return (
      <div>
        <PageHeader title="관리자 모드" desc="운영·회계·회원 관리" />
        <Card><EmptyState icon={<Lock size={30} />} title="접근 권한이 없습니다" desc="관리자 모드는 대표(관리자) 또는 권한을 받은 계정만 사용할 수 있습니다." /></Card>
      </div>
    );
  }
  return <FirmAdminHub can={can} />;
}

/* ───────── 운영자 콘솔 (플랫폼 전체) ───────── */

interface Overview { members: number; firms: number; active_subs: number; free: number; new_30d: number; mrr: number }
interface Member {
  member_id: string; name: string | null; email: string | null; phone: string | null; role: string;
  super_admin: boolean; firm_id: string; firm_name: string | null; plan: string;
  sub_status: string; sub_until: string | null; is_free: boolean; org_type: string; created_at: string;
  last_active: string | null;
}
const PLAN_PRICE: Record<string, number> = { pro: 59000, team: 149000, free: 0 };
const PLAN_LABEL: Record<string, string> = { free: "Free", pro: "Pro", team: "Team" };

const TABS = [
  { id: "dashboard", label: "대시보드", icon: BarChart3 },
  { id: "members", label: "전체 회원", icon: Users },
  { id: "stats", label: "통계", icon: Activity },
  { id: "approval", label: "승인 대기", icon: ClipboardCheck },
  { id: "tickets", label: "문의", icon: MessageSquare },
  { id: "notice", label: "공지·배너", icon: Megaphone },
  { id: "baseline", label: "기준값", icon: SlidersHorizontal },
] as const;

function OperatorConsole() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("dashboard");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) { setErr("로그인이 필요합니다."); return; }
    const [o, m] = await Promise.all([sb.rpc("admin_overview"), sb.rpc("admin_list_members")]);
    if (o.error) setErr(o.error.message); else setOverview(o.data as Overview);
    if (m.error) setErr(m.error.message); else setMembers((m.data ?? []) as Member[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="관리자 모드"
        desc="플랫폼 전체 가입자·구독·운영 관리"
        action={<Badge tone="brand"><ShieldCheck size={12} /> ADMIN · 운영자</Badge>}
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${tab === t.id ? "bg-brand-50 text-brand-700" : "text-muted hover:text-ink"}`}>
            <t.icon size={14} /> {t.label}{t.id === "members" && members ? ` (${members.length})` : ""}
          </button>
        ))}
      </div>

      {err && <div className="mb-3 rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{err}</div>}

      {tab === "dashboard" && <DashboardTab overview={overview} members={members} />}
      {tab === "members" && <MembersTab members={members} reload={load} setErr={setErr} />}
      {tab === "stats" && <StatsTab />}
      {tab === "approval" && <ApprovalTab />}
      {tab === "tickets" && <TicketsTab />}
      {tab === "notice" && <NoticeTab />}
      {tab === "baseline" && <BaselineTab />}
    </div>
  );
}

/* ───────── 1:1 문의 탭 ───────── */

interface AdminTicket {
  id: number; firm_id: string; firm_name: string | null; member_email: string | null;
  subject: string | null; body: string; status: string; reply: string | null; created_at: string; replied_at: string | null;
}
function TicketsTab() {
  const [rows, setRows] = useState<AdminTicket[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [replyMap, setReplyMap] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) { setErr("로그인이 필요합니다."); return; }
    const { data, error } = await sb.rpc("admin_list_tickets");
    if (error) setErr(error.message); else setRows((data ?? []) as AdminTicket[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const sendReply = async (t: AdminTicket) => {
    const reply = (replyMap[t.id] ?? t.reply ?? "").trim();
    if (!reply) return;
    setBusy(t.id); setErr(null);
    const { error } = await getSupabase()!.from("support_tickets").update({ reply, status: "answered", replied_at: new Date().toISOString() }).eq("id", t.id);
    if (error) setErr(error.message); else await load();
    setBusy(null);
  };
  const close = async (t: AdminTicket) => {
    setBusy(t.id); setErr(null);
    const { error } = await getSupabase()!.from("support_tickets").update({ status: "closed" }).eq("id", t.id);
    if (error) setErr(error.message); else await load();
    setBusy(null);
  };

  if (!rows) return <Loading />;
  if (rows.length === 0) return <Placeholder icon={<MessageSquare size={28} />} title="문의 없음" desc="접수된 1:1 문의가 없습니다." />;
  return (
    <div className="space-y-3">
      {err && <div className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{err}</div>}
      {rows.map((t) => (
        <Card key={t.id}>
          <div className="space-y-2 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-semibold text-ink">{t.subject || "문의"}</span>
                <Badge tone={t.status === "answered" ? "success" : t.status === "closed" ? "muted" : "warning"}>
                  {t.status === "answered" ? "답변완료" : t.status === "closed" ? "종료" : "대기중"}
                </Badge>
              </div>
              <span className="text-[11px] text-faint">{t.created_at.slice(0, 16).replace("T", " ")}</span>
            </div>
            <div className="text-[11.5px] text-faint">{t.firm_name} · {t.member_email}</div>
            <p className="whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-[13px] text-ink-soft">{t.body}</p>
            <textarea
              value={replyMap[t.id] ?? t.reply ?? ""}
              onChange={(e) => setReplyMap((m) => ({ ...m, [t.id]: e.target.value }))}
              rows={2}
              placeholder="답변을 입력하세요"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => sendReply(t)} disabled={busy === t.id}>
                {busy === t.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} 답변 전송
              </Button>
              {t.status !== "closed" && (
                <button onClick={() => close(t)} disabled={busy === t.id} className="rounded-lg border border-line px-3 text-[12.5px] font-medium text-muted hover:bg-surface-2">종료</button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ───────── 공통 기준값 중앙관리 탭 ───────── */

function BaselineTab() {
  const [b, setB] = useState<PlatformBaseline | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetchPlatformBaseline().then((d) =>
      setB(d ?? { medianIncomeByHousehold: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }, livingCostRatio: 0.6, baseYear: new Date().getFullYear() }),
    );
  }, []);
  if (!b) return <Loading />;
  const households = [1, 2, 3, 4, 5, 6, 7];
  const numOf = (v: string) => Number(String(v).replace(/[^0-9]/g, "")) || 0;
  const setMed = (h: number, v: number) => setB({ ...b, medianIncomeByHousehold: { ...b.medianIncomeByHousehold, [h]: v } });
  const save = async () => {
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await savePlatformBaseline(b);
    if (error) setErr(error);
    else setMsg("저장되었습니다. 각 사무소는 ‘설정·구독 → 사무소·기준값’에서 ‘운영자 권장값 적용’을 눌러 반영합니다.");
    setBusy(false);
  };
  return (
    <Card>
      <CardHeader title="공통 기준값 (중앙 관리)" desc="기준 중위소득·생계비 비율의 전 사무소 권장값입니다. 매년 고시값으로 갱신하세요." action={<SlidersHorizontal size={15} className="text-brand" />} />
      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="기준 연도">
            <Input value={String(b.baseYear)} inputMode="numeric" onChange={(e) => setB({ ...b, baseYear: numOf(e.target.value) })} />
          </Field>
          <Field label="생계비 인정 비율 (%)" hint="통상 60%">
            <Input value={String(Math.round(b.livingCostRatio * 100))} inputMode="numeric" onChange={(e) => setB({ ...b, livingCostRatio: numOf(e.target.value) / 100 })} />
          </Field>
        </div>
        <div>
          <div className="mb-1.5 text-[12.5px] font-semibold text-ink-soft">가구원수별 기준 중위소득 (월, 원)</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {households.map((h) => (
              <Field key={h} label={`${h}인 가구`}>
                <Input value={b.medianIncomeByHousehold[h] ? String(b.medianIncomeByHousehold[h]) : ""} inputMode="numeric" onChange={(e) => setMed(h, numOf(e.target.value))} />
              </Field>
            ))}
          </div>
        </div>
        {err && <div className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{err}</div>}
        {msg && <div className="rounded-lg bg-success-bg px-3 py-2 text-[13px] text-success">{msg}</div>}
        <Button onClick={save} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 저장</Button>
      </div>
    </Card>
  );
}

function DashboardTab({ overview, members }: { overview: Overview | null; members: Member[] | null }) {
  const series = useMemo(() => {
    if (!members) return [];
    const now = new Date();
    const months: { ym: string; label: string; n: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ ym, label: `${d.getMonth() + 1}월`, n: members.filter((m) => (m.created_at || "").slice(0, 7) === ym).length });
    }
    return months;
  }, [members]);
  const max = Math.max(1, ...series.map((s) => s.n));

  const planDist = useMemo(() => {
    const d: Record<string, number> = { free: 0, pro: 0, team: 0 };
    (members ?? []).forEach((m) => { d[m.plan] = (d[m.plan] ?? 0) + 1; });
    return d;
  }, [members]);
  const expiring = useMemo(() =>
    (members ?? [])
      .filter((m) => !m.is_free && m.sub_status === "active" && m.sub_until)
      .map((m) => ({ m, d: dday(m.sub_until) }))
      .filter((x) => x.d !== null && (x.d as number) <= 30)
      .sort((a, b) => (a.d as number) - (b.d as number)),
  [members]);
  const inactive = useMemo(() =>
    (members ?? [])
      .map((m) => ({ m, days: m.last_active ? Math.floor((Date.now() - new Date(m.last_active).getTime()) / 86400000) : null }))
      .filter((x) => x.days === null || x.days >= 14)
      .sort((a, b) => (b.days ?? 99999) - (a.days ?? 99999)),
  [members]);

  if (!overview) return <Loading />;
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-2 divide-x divide-y divide-line-soft md:grid-cols-4 md:divide-y-0">
          <Stat label="전체 가입자" value={`${overview.members}명`} sub={`사무소 ${overview.firms}곳`} />
          <Stat label="활성 구독" value={`${overview.active_subs}곳`} tone="success" sub={`무료 ${overview.free}곳`} />
          <Stat label="최근 30일 신규" value={`${overview.new_30d}명`} tone="brand" />
          <Stat label="월 구독 매출(추정)" value={won(overview.mrr)} sub="활성·유료 기준" />
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
          <span className="text-[14px] font-semibold text-ink">가입자 추이</span>
          <TrendingUp size={15} className="text-brand" />
        </div>
        <div className="flex h-44 items-end gap-3 p-5">
          {series.map((s) => (
            <div key={s.ym} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="text-[11px] font-semibold text-ink-soft tnum">{s.n || ""}</div>
              <div className="flex w-full items-end" style={{ height: "110px" }}>
                <div className="w-full rounded-t bg-brand" style={{ height: `${(s.n / max) * 100}%`, minHeight: s.n ? 3 : 0 }} />
              </div>
              <div className="text-[11px] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 플랜 분포 + 매출 구성 */}
      <Card>
        <CardHeader title="플랜 분포 · 매출 구성" desc="플랜별 사무소 수와 월 구독 매출 기여(추정)" />
        <div className="space-y-2.5 p-5">
          {(() => {
            const totalFirms = Math.max(1, (members ?? []).length);
            return (["team", "pro", "free"] as const).map((p) => {
              const n = planDist[p] ?? 0;
              const rev = n * (PLAN_PRICE[p] ?? 0);
              return (
                <div key={p} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-[12.5px] font-semibold text-ink">{PLAN_LABEL[p]}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${p === "free" ? "bg-faint" : "bg-brand"}`} style={{ width: `${(n / totalFirms) * 100}%` }} /></div>
                  <span className="w-10 shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-ink">{n}곳</span>
                  <span className="w-24 shrink-0 text-right text-[12px] tabular-nums text-muted">{rev ? won(rev) : "—"}</span>
                </div>
              );
            });
          })()}
          <p className="pt-1 text-[11px] text-faint">※ 월별 매출 추이 그래프는 실결제(토스) 연동 후 실데이터로 제공됩니다. 현재는 활성·유료 구독 기준 추정.</p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 구독 만료 임박 */}
        <Card>
          <CardHeader title="구독 만료 임박 (D-30)" desc={`${expiring.length}곳 — 갱신 유도 대상`} />
          {expiring.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-muted">30일 내 만료 예정인 유료 구독이 없습니다.</div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {expiring.slice(0, 8).map(({ m, d }) => (
                <li key={m.firm_id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-ink">{m.firm_name}</div>
                    <div className="text-[11px] text-faint">{m.name} · {m.plan?.toUpperCase()} · {m.sub_until}</div>
                  </div>
                  <Badge tone={(d as number) <= 7 ? "danger" : "warning"}>D-{d}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 이탈 위험(미접속) */}
        <Card>
          <CardHeader title="이탈 위험 (14일+ 미접속)" desc={`${inactive.length}곳 — 케어 대상`} />
          {inactive.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-muted">최근 접속이 활발합니다. 이탈 위험 사무소가 없습니다.</div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {inactive.slice(0, 8).map(({ m, days }) => (
                <li key={m.firm_id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-ink">{m.firm_name}</div>
                    <div className="text-[11px] text-faint">{m.name} · {m.email}</div>
                  </div>
                  <Badge tone="muted">{days === null ? "접속 기록 없음" : `${days}일 전`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* 무료체험 전환 현황 */}
      {(() => {
        const list = members ?? [];
        const total = list.length || 1;
        const paid = list.filter((m) => !m.is_free && (m.plan === "pro" || m.plan === "team")).length;
        const trial = list.filter((m) => m.is_free || m.plan === "free").length;
        const rate = Math.round((paid / total) * 100);
        const endingSoon = list.filter((m) => {
          if (!(m.is_free || m.plan === "free") || !m.sub_until) return false;
          const d = dday(m.sub_until);
          return d !== null && d >= 0 && d <= 7;
        }).length;
        return (
          <Card>
            <CardHeader title="무료체험 전환 현황" desc="체험·무료 → 유료 구독 전환 (실결제 연동 시 정밀 집계)" />
            <div className="grid grid-cols-2 divide-x divide-y divide-line-soft md:grid-cols-4 md:divide-y-0">
              <Stat label="유료 전환" value={`${paid}곳`} tone="success" />
              <Stat label="체험·무료" value={`${trial}곳`} />
              <Stat label="전환율" value={`${rate}%`} tone="brand" />
              <Stat label="체험 종료 임박(7일)" value={`${endingSoon}곳`} tone={endingSoon ? "danger" : undefined} />
            </div>
          </Card>
        );
      })()}
    </div>
  );
}

const dday = (until: string | null) => {
  if (!until) return null;
  const d = new Date(until); const now = new Date();
  d.setHours(0, 0, 0, 0); now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
};

function MembersTab({ members, reload, setErr }: { members: Member[] | null; reload: () => Promise<void>; setErr: (s: string | null) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!members) return <Loading />;
  if (members.length === 0) return <Placeholder icon={<Users size={28} />} title="가입자가 없습니다" desc="가입자가 생기면 여기에 표시됩니다." />;

  const act = async (key: string, fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(key); setErr(null);
    const { error } = await fn();
    if (error) setErr(error.message === "last_super_admin" ? "마지막 운영자는 해제할 수 없습니다." : error.message);
    else await reload();
    setBusy(null);
  };
  const sb = () => getSupabase()!;

  return (
    <div className="space-y-3">
      {members.map((m) => {
        const n = dday(m.sub_until);
        const sub = m.is_free
          ? <Badge tone="info"><Gift size={11} /> 무료</Badge>
          : m.sub_status === "suspended"
          ? <Badge tone="danger"><Pause size={11} /> 정지</Badge>
          : n !== null && n < 0
          ? <Badge tone="danger">만료</Badge>
          : <Badge tone="success">D-{n ?? "?"}</Badge>;
        return (
          <Card key={m.member_id}>
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-muted">
                  {m.super_admin ? <Crown size={17} className="text-brand-700" /> : <UserCheck size={17} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                    {m.name || m.email}
                    {m.super_admin && <Badge tone="brand">운영자</Badge>}
                    <Badge tone="muted">{m.org_type === "org" ? "단체" : "개인"}</Badge>
                  </div>
                  <div className="text-[12px] text-muted">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
                  <div className="mt-0.5 text-[11.5px] text-faint">{m.firm_name} · {m.plan?.toUpperCase()} · 만료 {m.sub_until ? formatDate(m.sub_until) : "—"}</div>
                </div>
                <div className="ml-auto">{sub}</div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant="secondary" disabled={busy === m.firm_id + "ext"}
                  onClick={() => act(m.firm_id + "ext", () => sb().rpc("admin_extend_sub", { p_firm: m.firm_id, p_months: 1 }).then((r) => ({ error: r.error })))}>
                  <CalendarPlus size={13} /> 1개월 연장
                </Button>
                {m.sub_status === "suspended" ? (
                  <Button size="sm" variant="secondary" disabled={busy === m.firm_id + "st"}
                    onClick={() => act(m.firm_id + "st", () => sb().rpc("admin_set_subscription", { p_firm: m.firm_id, p_status: "active", p_free: null }).then((r) => ({ error: r.error })))}>
                    <Play size={13} /> 재개
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" disabled={busy === m.firm_id + "st"}
                    onClick={() => act(m.firm_id + "st", () => sb().rpc("admin_set_subscription", { p_firm: m.firm_id, p_status: "suspended", p_free: null }).then((r) => ({ error: r.error })))}>
                    <Pause size={13} /> 정지
                  </Button>
                )}
                <button onClick={() => act(m.firm_id + "fr", () => sb().rpc("admin_set_subscription", { p_firm: m.firm_id, p_status: null, p_free: !m.is_free }).then((r) => ({ error: r.error })))}
                  disabled={busy === m.firm_id + "fr"}
                  className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[12.5px] font-medium ${m.is_free ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"}`}>
                  <Gift size={13} /> 무료
                </button>
                <button onClick={() => act(m.member_id + "sa", () => sb().rpc("admin_set_super_admin", { p_member: m.member_id, p_val: !m.super_admin }).then((r) => ({ error: r.error })))}
                  disabled={busy === m.member_id + "sa"}
                  className={`ml-auto inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[12.5px] font-semibold ${m.super_admin ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"}`}>
                  <Crown size={13} /> {m.super_admin ? "운영자 해제" : "운영자 지정"}
                </button>
                {busy?.startsWith(m.firm_id) || busy?.startsWith(m.member_id) ? <Loader2 size={14} className="animate-spin text-faint" /> : null}
              </div>
            </div>
          </Card>
        );
      })}
      <p className="text-[11.5px] text-faint">※ 단체(회사) 가입자는 자체 ‘회원 관리·권한 설정’에서 직원·권한을 관리합니다(업무별 담당자에게 선택적 권한 부여).</p>
    </div>
  );
}

function Placeholder({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return <Card><EmptyState icon={icon} title={title} desc={desc} /></Card>;
}
function Loading() {
  return <Card><div className="flex items-center justify-center gap-2 py-12 text-muted"><Loader2 size={18} className="animate-spin" /> 불러오는 중…</div></Card>;
}

/* ───────── 승인 대기 탭 (단체 가입) ───────── */

interface PendingFirm {
  firm_id: string; firm_name: string | null; org_type: string; status: string;
  owner_name: string | null; owner_email: string | null; owner_phone: string | null; created_at: string;
}
function ApprovalTab() {
  const [rows, setRows] = useState<PendingFirm[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) { setErr("로그인이 필요합니다."); return; }
    const { data, error } = await sb.rpc("admin_pending_firms");
    if (error) setErr(error.message); else setRows((data ?? []) as PendingFirm[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (firm: string, status: "approved" | "rejected") => {
    setBusy(firm + status); setErr(null);
    const sb = getSupabase();
    const { error } = await sb!.rpc("admin_set_firm_status", { p_firm: firm, p_status: status });
    if (error) setErr(error.message); else await load();
    setBusy(null);
  };

  if (!rows) return <Loading />;
  if (rows.length === 0) return <Placeholder icon={<ClipboardCheck size={28} />} title="승인 대기 없음" desc="대기 중인 단체(회사) 가입 신청이 없습니다. 개인 가입은 승인 없이 즉시 이용됩니다." />;

  return (
    <div className="space-y-3">
      {err && <div className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{err}</div>}
      {rows.map((r) => (
        <Card key={r.firm_id}>
          <div className="flex flex-wrap items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Building2 size={18} /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">{r.firm_name}<Badge tone="muted">단체</Badge></div>
              <div className="text-[12px] text-muted">{r.owner_name} · {r.owner_email}{r.owner_phone ? ` · ${r.owner_phone}` : ""}</div>
              <div className="text-[11px] text-faint">신청 {r.created_at?.slice(0, 10)}</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" disabled={busy === r.firm_id + "approved"} onClick={() => act(r.firm_id, "approved")}>
                {busy === r.firm_id + "approved" ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />} 승인
              </Button>
              <button disabled={busy === r.firm_id + "rejected"} onClick={() => act(r.firm_id, "rejected")}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-danger px-2.5 text-[12.5px] font-semibold text-danger hover:bg-danger-bg disabled:opacity-50">
                <X size={14} /> 거절
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ───────── 통계 탭 (접속·사용량) ───────── */

interface Stats {
  logins: number; visits: number; visitors_per_day: number; feature_total: number;
  by_type: Record<string, number>; daily: { d: string; logins: number; visitors: number }[];
}
const FEATURE_LABEL: Record<string, string> = {
  ai_document: "AI 서류작성", analyze: "거래내역 분석", correction: "보정 처리",
  issue: "서류 자동발급", upload: "파일 업로드", doc_save: "서류 저장",
};
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const PERIODS = [
  { id: "7", label: "최근 7일" }, { id: "30", label: "최근 30일" },
  { id: "month", label: "이번 달" }, { id: "year", label: "올해" }, { id: "all", label: "전체" },
];
function rangeFor(id: string) {
  const to = new Date();
  let from = new Date();
  if (id === "7") from.setDate(to.getDate() - 6);
  else if (id === "30") from.setDate(to.getDate() - 29);
  else if (id === "month") from = new Date(to.getFullYear(), to.getMonth(), 1);
  else if (id === "year") from = new Date(to.getFullYear(), 0, 1);
  else from = new Date(2024, 0, 1);
  return { from: fmtD(from), to: fmtD(to) };
}

function StatsTab() {
  const [period, setPeriod] = useState("30");
  const [data, setData] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    (async () => {
      const sb = getSupabase();
      if (!sb) { setErr("로그인이 필요합니다."); return; }
      setData(null); setErr(null);
      const { from, to } = rangeFor(period);
      const { data: d, error } = await sb.rpc("admin_stats", { p_from: from, p_to: to });
      if (!on) return;
      if (error) setErr(error.message); else setData(d as Stats);
    })();
    return () => { on = false; };
  }, [period]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${period === p.id ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"}`}>
            {p.label}
          </button>
        ))}
      </div>
      {err && <div className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{err}</div>}
      {!data ? <Loading /> : (
        <>
          <Card>
            <div className="grid grid-cols-2 divide-x divide-y divide-line-soft md:grid-cols-4 md:divide-y-0">
              <Stat label="로그인 수" value={`${data.logins}회`} />
              <Stat label="일평균 방문자" value={`${data.visitors_per_day}명`} tone="brand" />
              <Stat label="방문(세션)" value={`${data.visits}회`} />
              <Stat label="기능 사용" value={`${data.feature_total}회`} tone="success" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
              <span className="text-[14px] font-semibold text-ink">날짜별 접속(로그인)</span>
              <Activity size={15} className="text-brand" />
            </div>
            <DailyChart daily={data.daily} />
          </Card>

          <Card>
            <CardHeader title="기능별 사용량" desc="기간 내 핵심 기능 호출 횟수" />
            <div className="space-y-2.5 p-5">
              {(() => {
                const rows = Object.keys(FEATURE_LABEL).map((k) => ({ k, label: FEATURE_LABEL[k], n: data.by_type[k] ?? 0 }));
                const max = Math.max(1, ...rows.map((r) => r.n));
                if (rows.every((r) => r.n === 0)) return <p className="py-4 text-center text-[13px] text-muted">아직 기록된 사용 내역이 없습니다.</p>;
                return rows.map((r) => (
                  <div key={r.k} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-[12.5px] text-ink-soft">{r.label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand" style={{ width: `${(r.n / max) * 100}%` }} /></div>
                    <span className="w-10 shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-ink">{r.n}</span>
                  </div>
                ));
              })()}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function DailyChart({ daily }: { daily: Stats["daily"] }) {
  if (!daily || daily.length === 0) return <div className="py-10 text-center text-[13px] text-muted">기간 내 접속 데이터가 없습니다.</div>;
  const max = Math.max(1, ...daily.map((x) => x.logins));
  const show = daily.length > 31 ? daily.slice(-31) : daily;
  return (
    <div className="flex h-44 items-end gap-1 overflow-x-auto p-5">
      {show.map((x) => (
        <div key={x.d} className="flex min-w-[14px] flex-1 flex-col items-center gap-1" title={`${x.d} · 로그인 ${x.logins} · 방문자 ${x.visitors}`}>
          <div className="text-[10px] font-semibold text-ink-soft tnum">{x.logins || ""}</div>
          <div className="flex w-full items-end" style={{ height: "100px" }}>
            <div className="w-full rounded-t bg-brand" style={{ height: `${(x.logins / max) * 100}%`, minHeight: x.logins ? 3 : 0 }} />
          </div>
          <div className="text-[9px] text-faint">{x.d.slice(5)}</div>
        </div>
      ))}
    </div>
  );
}

/* ───────── 공지·배너 탭 ───────── */

const selCls2 = "h-9.5 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100";

function NoticeTab() {
  const { items, err, reload, setErr } = useAdminAnnouncements();
  const [kind, setKind] = useState<"notice" | "banner">("notice");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [tone, setTone] = useState("brand");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!title.trim() && !body.trim()) { setErr("제목 또는 내용을 입력하세요."); return; }
    setBusy(true); setErr(null);
    const sb = getSupabase();
    const { error } = await sb!.from("announcements").insert({
      kind, title: title.trim() || null, body: body.trim() || null,
      link: link.trim() || null, tone: kind === "banner" ? tone : null, active: true,
    });
    if (error) setErr(error.message);
    else { setTitle(""); setBody(""); setLink(""); await reload(); }
    setBusy(false);
  };
  const toggle = async (id: number, active: boolean) => {
    const sb = getSupabase();
    const { error } = await sb!.from("announcements").update({ active: !active }).eq("id", id);
    if (error) setErr(error.message); else await reload();
  };
  const remove = async (id: number) => {
    const sb = getSupabase();
    const { error } = await sb!.from("announcements").delete().eq("id", id);
    if (error) setErr(error.message); else await reload();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="공지·배너 등록" desc="공지는 종 아이콘에, 배너는 상단 바에 전체 사용자에게 표시됩니다." />
        <div className="space-y-3 p-5">
          <div className="flex gap-1.5">
            {([{ v: "notice", l: "공지사항" }, { v: "banner", l: "배너" }] as const).map((o) => (
              <button key={o.v} onClick={() => setKind(o.v)}
                className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium ${kind === o.v ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"}`}>{o.l}</button>
            ))}
          </div>
          <Field label="제목"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "banner" ? "예: 6월 정기점검 안내" : "공지 제목"} /></Field>
          <Field label="내용">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={kind === "banner" ? 2 : 4}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              placeholder="내용을 입력하세요" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="링크(선택)"><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></Field>
            {kind === "banner" && (
              <Field label="배너 색상">
                <select className={selCls2} value={tone} onChange={(e) => setTone(e.target.value)}>
                  <option value="brand">골드(기본)</option><option value="info">블루</option><option value="warning">옐로</option>
                </select>
              </Field>
            )}
          </div>
          {err && <div className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{err}</div>}
          <Button onClick={create} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />} 등록</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="등록된 공지·배너" desc={items ? `${items.length}건` : undefined} />
        {!items ? <Loading /> : items.length === 0 ? (
          <EmptyState icon={<Megaphone size={26} />} title="등록된 항목이 없습니다" />
        ) : (
          <ul className="divide-y divide-line-soft">
            {items.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                <Badge tone={a.kind === "banner" ? "brand" : "muted"}>{a.kind === "banner" ? "배너" : "공지"}</Badge>
                <div className="min-w-0 flex-1">
                  {a.title && <div className="text-[13.5px] font-semibold text-ink">{a.title}</div>}
                  {a.body && <div className="truncate text-[12.5px] text-muted">{a.body}</div>}
                  <div className="text-[11px] text-faint">{a.created_at.slice(0, 10)}{a.active ? "" : " · 비활성"}</div>
                </div>
                <button onClick={() => toggle(a.id, a.active)}
                  className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[12px] font-medium ${a.active ? "border-success text-success bg-success-bg" : "border-line text-muted hover:bg-surface-2"}`}>
                  {a.active ? <><Play size={12} /> 활성</> : <><Pause size={12} /> 비활성</>}
                </button>
                <button onClick={() => remove(a.id)} title="삭제" className="flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-surface-2 hover:text-danger"><X size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ───────── 사무소(firm) 관리자 허브 ───────── */

function FirmAdminHub({ can }: { can: (k: string) => boolean }) {
  const tiles = [
    { href: "/members", icon: <Users size={22} />, title: "회원 관리 · 권한 설정", desc: "직원을 관리자로 지정/해제하고, 항목별 권한을 선별 부여합니다.", perm: "members" },
    { href: "/management", icon: <BarChart3 size={22} />, title: "경영 대시보드", desc: "매출·계약·미수금 등 운영·회계 통계를 기간별로 봅니다.", perm: "dashboard" },
    { href: "/payments", icon: <Wallet size={22} />, title: "분납 · 미수금 관리", desc: "수임료 분납계획·완납 처리·연체 현황을 관리합니다.", perm: "payments" },
    { href: "/manual-print", icon: <Printer size={22} />, title: "매뉴얼 인쇄 · PDF", desc: "사용설명서를 인쇄하거나 PDF로 저장합니다.", perm: "print" },
  ].filter((t) => can(t.perm));

  return (
    <div>
      <PageHeader title="관리자 모드" desc="운영·회계·회원 관리를 한 곳에서" action={<Badge tone="brand"><ShieldCheck size={12} /> ADMIN</Badge>} />
      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} target={t.href === "/manual-print" ? "_blank" : undefined}>
            <Card className="h-full transition-shadow hover:shadow-[var(--shadow-pop)]">
              <div className="flex items-start gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{t.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><h3 className="text-[15px] font-bold text-ink">{t.title}</h3><ChevronRight size={18} className="shrink-0 text-faint" /></div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{t.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
