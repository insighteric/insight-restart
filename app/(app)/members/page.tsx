"use client";

import { useEffect, useState } from "react";
import { UserCog, Lock, ShieldCheck, User as UserIcon, Loader2, Info } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";
import { PERMISSIONS } from "@/lib/permissions";

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

          <Card>
            <div className="flex items-start gap-2 p-4 text-[12.5px] text-muted">
              <Info size={15} className="mt-0.5 shrink-0 text-brand" />
              <div>
                <p className="font-semibold text-ink-soft">직원 추가 방법</p>
                <p className="mt-0.5">현재는 가입 시 각자 새 사무소가 만들어집니다. 같은 사무소에 직원을 합류시키는 <b>초대 기능</b>은 다음 단계에서 추가할 수 있습니다. 합류한 직원은 여기서 관리자 지정·권한 부여가 가능합니다.</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
