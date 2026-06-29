"use client";

import { useCallback, useEffect, useState } from "react";
import { UserCog, Lock, ShieldCheck, User as UserIcon, Loader2, Info, UserPlus, Copy, Check, Ban } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Badge, EmptyState, Button } from "@/components/ui";
import { PERMISSIONS } from "@/lib/permissions";

interface Invite { id: number; code: string; role: string; active: boolean; created_at: string }

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  phone: string | null;
  permissions: string[];
}

export default function MembersPage() {
  const { can, configured, firmId, user } = useAuth();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !firmId) { setMembers([]); return; }
    const sb = getSupabase();
    if (!sb) { setMembers([]); return; }
    sb.from("members").select("id, name, email, role, phone, permissions").eq("firm_id", firmId)
      .then(({ data, error }) => {
        if (error) { setErr(error.message); setMembers([]); return; }
        setMembers((data ?? []).map((m) => ({ ...m, permissions: Array.isArray(m.permissions) ? m.permissions : [] })) as Member[]);
      });
  }, [configured, firmId]);

  const ownerCount = (members ?? []).filter((m) => m.role === "owner").length;

  const patch = async (id: string, p: Partial<Member>) => {
    const sb = getSupabase();
    if (!sb) return;
    setSavingId(id); setErr(null);
    const { error } = await sb.from("members").update(p).eq("id", id);
    if (error) setErr(error.message);
    else setMembers((ms) => (ms ?? []).map((m) => (m.id === id ? { ...m, ...p } : m)));
    setSavingId(null);
  };

  const setRole = (m: Member, role: string) => {
    if (m.role === "owner" && role !== "owner" && ownerCount <= 1) {
      alert("마지막 관리자(대표)는 직원으로 변경할 수 없습니다. 다른 멤버를 먼저 관리자로 지정하세요.");
      return;
    }
    patch(m.id, { role });
  };

  const togglePerm = (m: Member, key: string) => {
    const has = m.permissions.includes(key);
    patch(m.id, { permissions: has ? m.permissions.filter((k) => k !== key) : [...m.permissions, key] });
  };

  if (!can("members")) {
    return (
      <div>
        <PageHeader title="멤버·권한" desc="관리자 지정·권한 부여" />
        <Card><EmptyState icon={<Lock size={30} />} title="접근 권한이 없습니다" desc="‘멤버·권한 관리’ 권한이 있는 계정만 사용할 수 있습니다." /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="멤버·권한" desc="가입자를 관리자로 지정/해제하고, 항목별 권한을 선별 부여합니다." action={<Badge tone="brand"><UserCog size={11} /> 관리자</Badge>} />

      {!configured ? (
        <Card><EmptyState icon={<Info size={28} />} title="로그인 환경에서 동작합니다" desc="멤버·권한 관리는 Supabase 로그인(클라우드) 환경에서만 사용할 수 있습니다. 데모 모드에서는 모든 권한이 열려 있습니다." /></Card>
      ) : members === null ? (
        <Card><div className="flex items-center justify-center gap-2 py-12 text-muted"><Loader2 size={18} className="animate-spin" /> 멤버 불러오는 중…</div></Card>
      ) : (
        <div className="space-y-3">
          {err && <div className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{err}</div>}

          <Card>
            <CardHeader title={`사무소 멤버 ${members.length}명`} desc="관리자(대표)는 모든 권한을 가집니다. 직원은 아래에서 선택한 권한만 갖습니다." />
            <div className="divide-y divide-line-soft">
              {members.map((m) => {
                const isOwner = m.role === "owner";
                const isMe = m.id === user?.id;
                return (
                  <div key={m.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-muted">
                        {isOwner ? <ShieldCheck size={17} className="text-brand-700" /> : <UserIcon size={17} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                          {m.name || (m.email ?? "멤버")}{isMe && <span className="text-[11px] font-normal text-faint">(나)</span>}
                        </div>
                        <div className="text-[12px] text-muted">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
                      </div>
                      {/* 역할 토글 */}
                      <div className="ml-auto flex items-center gap-1 rounded-lg border border-line p-0.5">
                        {(["owner", "staff"] as const).map((r) => (
                          <button key={r} onClick={() => setRole(m, r)} disabled={savingId === m.id}
                            className={`rounded-md px-2.5 py-1 text-[12.5px] font-semibold transition-colors ${m.role === r ? (r === "owner" ? "bg-brand-50 text-brand-700" : "bg-surface-2 text-ink") : "text-muted hover:bg-surface-2"}`}>
                            {r === "owner" ? "관리자" : "직원"}
                          </button>
                        ))}
                      </div>
                      {savingId === m.id && <Loader2 size={14} className="animate-spin text-faint" />}
                    </div>

                    {/* 권한 (직원만 선택, 관리자는 전체) */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {PERMISSIONS.map((p) => {
                        const granted = isOwner || m.permissions.includes(p.key);
                        return (
                          <button key={p.key} onClick={() => !isOwner && togglePerm(m, p.key)} disabled={isOwner || savingId === m.id}
                            title={p.desc}
                            className={`rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${granted ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"} ${isOwner ? "cursor-default opacity-90" : ""}`}>
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                    {isOwner && <p className="mt-1.5 text-[11px] text-faint">관리자는 모든 권한을 가집니다.</p>}
                  </div>
                );
              })}
            </div>
          </Card>

          {members.some((m) => m.id === user?.id && m.role === "owner") && <InviteSection />}
        </div>
      )}
    </div>
  );
}

function InviteSection() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data, error } = await sb.from("invites").select("id, code, role, active, created_at").order("created_at", { ascending: false });
    if (error) setErr(error.message); else setInvites((data ?? []) as Invite[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const gen = async () => {
    setBusy(true); setErr(null);
    const sb = getSupabase();
    const { error } = await sb!.rpc("create_invite", { p_role: "staff" });
    if (error) setErr(error.message); else await load();
    setBusy(false);
  };
  const revoke = async (id: number) => {
    const sb = getSupabase();
    const { error } = await sb!.from("invites").update({ active: false }).eq("id", id);
    if (error) setErr(error.message); else await load();
  };
  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code); setTimeout(() => setCopied(null), 1500);
  };

  const active = (invites ?? []).filter((i) => i.active);

  return (
    <Card>
      <CardHeader
        title="직원 초대 (초대 코드)"
        desc="코드를 발급해 직원에게 전달하세요. 직원은 회원가입 → ‘초대코드로 합류’에서 입력하면 이 사무소에 합류합니다."
        action={<Button size="sm" onClick={gen} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={14} />} 코드 발급</Button>}
      />
      <div className="p-5">
        {err && <div className="mb-3 rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{err}</div>}
        {invites === null ? (
          <div className="flex items-center gap-2 py-4 text-muted"><Loader2 size={16} className="animate-spin" /> 불러오는 중…</div>
        ) : active.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-muted">활성 초대 코드가 없습니다. ‘코드 발급’으로 새 코드를 만드세요.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-lg border border-line-soft px-3 py-2.5">
                <code className="rounded-md bg-surface-2 px-2.5 py-1 text-[15px] font-bold tracking-widest text-ink">{i.code}</code>
                <Badge tone="muted">{i.role === "owner" ? "관리자" : "직원"}</Badge>
                <span className="text-[11px] text-faint">{i.created_at.slice(0, 10)}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={() => copy(i.code)} title="복사" className="flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-[12px] font-medium text-muted hover:bg-surface-2">
                    {copied === i.code ? <Check size={13} className="text-success" /> : <Copy size={13} />} {copied === i.code ? "복사됨" : "복사"}
                  </button>
                  <button onClick={() => revoke(i.id)} title="사용 중지" className="flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-surface-2 hover:text-danger"><Ban size={15} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11.5px] text-faint">※ 합류한 직원은 위 목록에서 관리자 지정·권한 부여가 가능합니다. 코드는 여러 번 사용할 수 있으니, 다 쓰면 ‘사용 중지’ 하세요.</p>
      </div>
    </Card>
  );
}
