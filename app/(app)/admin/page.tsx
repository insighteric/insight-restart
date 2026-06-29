"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, Users, BarChart3, Wallet, Lock, ChevronRight, Printer, Loader2,
  UserCheck, Crown, Pause, Play, Gift, CalendarPlus, TrendingUp, Megaphone, ClipboardCheck, Activity,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { PageHeader } from "@/components/AppShell";
import { Card, Badge, Stat, Button, EmptyState } from "@/components/ui";
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
}

const TABS = [
  { id: "dashboard", label: "대시보드", icon: BarChart3 },
  { id: "members", label: "전체 회원", icon: Users },
  { id: "stats", label: "통계", icon: Activity },
  { id: "approval", label: "승인 대기", icon: ClipboardCheck },
  { id: "notice", label: "공지·배너", icon: Megaphone },
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
      {tab === "stats" && <Placeholder icon={<Activity size={28} />} title="접속·사용량 통계" desc="로그인 수·방문자·기능 사용량(AI 호출·문서 생성 등) 통계입니다. 이벤트 추적 기능을 도입하면 자동 집계됩니다. (다음 단계)" />}
      {tab === "approval" && <Placeholder icon={<ClipboardCheck size={28} />} title="승인 대기 없음" desc="현재는 가입 즉시 사용 가능합니다. 가입 승인제를 도입하면 여기에서 신규 가입을 승인/거절할 수 있습니다. (다음 단계)" />}
      {tab === "notice" && <Placeholder icon={<Megaphone size={28} />} title="공지사항 · 배너 관리" desc="전체 사용자에게 보일 공지·배너를 등록·관리합니다. (다음 단계)" />}
    </div>
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
