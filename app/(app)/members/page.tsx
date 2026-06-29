"use client";

import { useCallback, useEffect, useState } from "react";
import { UserCog, Lock, ShieldCheck, User as UserIcon, Loader2, Info, UserPlus, Copy, Check, Activity, KeyRound, Trash2, Save } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Badge, EmptyState, Button, Field, Input } from "@/components/ui";
import { PERMISSIONS, PERM_PRESETS } from "@/lib/permissions";

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  phone: string | null;
  permissions: string[];
  staff_code?: string | null;
}

export default function MembersPage() {
  const { can, configured, firmId, user } = useAuth();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!configured || !firmId) { setMembers([]); return; }
    const sb = getSupabase();
    if (!sb) { setMembers([]); return; }
    const { data, error } = await sb.from("members").select("id, name, email, role, phone, permissions, staff_code").eq("firm_id", firmId);
    if (error) { setErr(error.message); setMembers([]); return; }
    setMembers((data ?? []).map((m) => ({ ...m, permissions: Array.isArray(m.permissions) ? m.permissions : [] })) as Member[]);
  }, [configured, firmId]);
  useEffect(() => { loadMembers(); }, [loadMembers]);

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

                    {/* 권한 프리셋 (직원만) */}
                    {!isOwner && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11.5px] font-medium text-faint">빠른 설정:</span>
                        {PERM_PRESETS.map((preset) => (
                          <button key={preset.key} onClick={() => patch(m.id, { permissions: preset.perms })} disabled={savingId === m.id}
                            title={preset.desc}
                            className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 권한 (직원만 선택, 관리자는 전체) */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
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

          {members.some((m) => m.id === user?.id && m.role === "owner") && firmId && (
            <StaffAccounts firmId={firmId} members={members} selfId={user?.id} reload={loadMembers} />
          )}
          <MemberActivity />
        </div>
      )}
    </div>
  );
}

interface ActRow { member_id: string; name: string | null; email: string | null; role: string; logins: number; features: number; last_active: string | null }
function MemberActivity() {
  const [rows, setRows] = useState<ActRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setRows([]); return; }
    sb.rpc("firm_member_activity", { p_days: 30 }).then(({ data, error }) => {
      if (error) setErr(error.message); else setRows((data ?? []) as ActRow[]);
    });
  }, []);
  const ago = (s: string | null) => {
    if (!s) return "기록 없음";
    const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
    return d <= 0 ? "오늘" : `${d}일 전`;
  };
  return (
    <Card>
      <CardHeader title="직원별 활동 · 실적" desc="최근 30일 — 로그인·기능 사용·마지막 접속" action={<Activity size={15} className="text-brand" />} />
      {rows === null ? (
        <div className="flex items-center gap-2 px-5 py-8 text-muted"><Loader2 size={16} className="animate-spin" /> 불러오는 중…</div>
      ) : err ? (
        <div className="px-5 py-4 text-[13px] text-danger">{err}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line-soft text-left text-[11px] uppercase tracking-wide text-faint">
                <th className="px-5 py-2.5 font-semibold">직원</th>
                <th className="px-3 py-2.5 text-right font-semibold">로그인</th>
                <th className="px-3 py-2.5 text-right font-semibold">기능 사용</th>
                <th className="px-5 py-2.5 text-right font-semibold">마지막 접속</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map((r) => (
                <tr key={r.member_id} className="hover:bg-surface-2">
                  <td className="px-5 py-2.5">
                    <span className="font-medium text-ink">{r.name || r.email}</span>
                    {r.role === "owner" && <Badge tone="brand">관리자</Badge>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{r.logins}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{r.features}</td>
                  <td className="px-5 py-2.5 text-right text-muted">{ago(r.last_active)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function StaffAccounts({ firmId, members, selfId, reload }: { firmId: string; members: Member[]; selfId?: string; reload: () => Promise<void> }) {
  const [firm, setFirm] = useState<{ code: string | null; seats: number } | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [seatInput, setSeatInput] = useState("");
  const [usercode, setUsercode] = useState("");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");

  const loadFirm = useCallback(async () => {
    const sb = getSupabase(); if (!sb) return;
    const { data } = await sb.from("firms").select("code, seats").eq("id", firmId).maybeSingle();
    setFirm({ code: (data?.code as string) ?? null, seats: (data?.seats as number) ?? 1 });
    setCodeInput((data?.code as string) ?? "");
    setSeatInput(String((data?.seats as number) ?? 1));
  }, [firmId]);
  useEffect(() => { loadFirm(); }, [loadFirm]);

  const authHeader = async (): Promise<Record<string, string>> => {
    const sb = getSupabase(); if (!sb) return {};
    const { data } = await sb.auth.getSession();
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  };
  const genPw = () => setPw(`ir${Math.floor(1000 + Math.random() * 9000)}!`);
  const copy = async (t: string) => { await navigator.clipboard.writeText(t); setCopied(t); setTimeout(() => setCopied(null), 1500); };

  const saveCode = async () => {
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await getSupabase()!.rpc("set_firm_code", { p_code: codeInput });
    if (error) setErr(error.message === "code_taken" ? "이미 사용 중인 사무소 코드입니다." : error.message === "bad_code" ? "사무소 코드는 2~12자 영문/숫자입니다." : error.message);
    else { setMsg("사무소 코드를 저장했습니다."); await loadFirm(); }
    setBusy(false);
  };
  const saveSeats = async () => {
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await getSupabase()!.rpc("set_seats", { p_seats: Number(seatInput) || 1 });
    if (error) setErr(error.message); else { await loadFirm(); setMsg("좌석 수를 변경했습니다."); }
    setBusy(false);
  };
  const createStaff = async () => {
    if (!usercode.trim() || pw.length < 6) { setErr("직원 코드와 6자 이상 비밀번호를 입력하세요."); return; }
    setBusy(true); setErr(null); setMsg(null);
    const res = await fetch("/api/admin/staff", { method: "POST", headers: { "content-type": "application/json", ...(await authHeader()) }, body: JSON.stringify({ usercode, name, password: pw }) });
    const j = await res.json().catch(() => ({}));
    if (!j.ok) setErr(j.message ?? "생성에 실패했습니다.");
    else { setMsg(`계정 생성 완료 — 아이디: ${j.loginId} · 비번: ${pw}`); setUsercode(""); setName(""); setPw(""); await reload(); }
    setBusy(false);
  };
  const resetPassword = async (memberId: string) => {
    if (resetPw.length < 6) { setErr("새 비밀번호는 6자 이상이어야 합니다."); return; }
    setBusy(true); setErr(null); setMsg(null);
    const res = await fetch("/api/admin/staff/password", { method: "POST", headers: { "content-type": "application/json", ...(await authHeader()) }, body: JSON.stringify({ memberId, password: resetPw }) });
    const j = await res.json().catch(() => ({}));
    if (!j.ok) setErr(j.message); else { setMsg("비밀번호를 변경했습니다."); setResetFor(null); setResetPw(""); }
    setBusy(false);
  };
  const removeStaff = async (memberId: string, label: string) => {
    if (!confirm(`${label} 계정을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBusy(true); setErr(null); setMsg(null);
    const res = await fetch("/api/admin/staff/delete", { method: "POST", headers: { "content-type": "application/json", ...(await authHeader()) }, body: JSON.stringify({ memberId }) });
    const j = await res.json().catch(() => ({}));
    if (!j.ok) setErr(j.message); else await reload();
    setBusy(false);
  };

  const staff = members.filter((m) => m.id !== selfId);
  const loginId = (m: Member) => (firm?.code && m.staff_code ? `${firm.code}-${m.staff_code}` : (m.email ?? ""));

  return (
    <Card>
      <CardHeader title="직원 계정 관리" desc="직원의 아이디·비밀번호를 직접 만들어 전달하세요. 직원은 회원가입 없이 바로 로그인합니다." action={<UserPlus size={15} className="text-brand" />} />
      <div className="space-y-4 p-5">
        {err && <div className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{err}</div>}
        {msg && <div className="rounded-lg bg-success-bg px-3 py-2 text-[13px] text-success">{msg}</div>}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="사무소 코드 (아이디 앞 단체 구분)" hint="예: SHINAN → 직원 아이디 SHINAN-B001">
            <div className="flex gap-1.5">
              <Input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="영문/숫자 2~12자" />
              <Button size="sm" variant="secondary" onClick={saveCode} disabled={busy}><Save size={13} /> 저장</Button>
            </div>
          </Field>
          <Field label="좌석 수 (관리자 포함)" hint={`현재 ${members.length}명 / 좌석 ${firm?.seats ?? "-"}`}>
            <div className="flex gap-1.5">
              <Input value={seatInput} onChange={(e) => setSeatInput(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" />
              <Button size="sm" variant="secondary" onClick={saveSeats} disabled={busy}><Save size={13} /> 저장</Button>
            </div>
          </Field>
        </div>

        <div className="rounded-xl border border-line-soft p-3">
          <div className="mb-2 text-[13px] font-semibold text-ink">직원 계정 만들기</div>
          {!firm?.code ? (
            <p className="text-[12.5px] text-muted">먼저 위에서 <b>사무소 코드</b>를 저장해 주세요.</p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
                <Input value={usercode} onChange={(e) => setUsercode(e.target.value.toUpperCase())} placeholder="직원 코드 (예: B001)" />
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
                <div className="flex gap-1.5">
                  <Input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="비밀번호(6자+)" />
                  <button onClick={genPw} title="자동 생성" className="shrink-0 rounded-lg border border-line px-2 text-[12px] text-muted hover:bg-surface-2">자동</button>
                </div>
                <Button size="sm" onClick={createStaff} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} 생성</Button>
              </div>
              <p className="mt-1.5 text-[11px] text-faint">아이디는 <b>{firm.code}-직원코드</b> 형식입니다. 직원은 로그인 화면에서 이 아이디 + 비밀번호로 접속합니다.</p>
            </>
          )}
        </div>

        {staff.length > 0 && (
          <div>
            <div className="mb-1.5 text-[12.5px] font-semibold text-ink-soft">직원 계정 {staff.length}개</div>
            <ul className="space-y-2">
              {staff.map((m) => (
                <li key={m.id} className="rounded-lg border border-line-soft p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-md bg-surface-2 px-2 py-1 text-[13px] font-bold tracking-wide text-ink">{loginId(m)}</code>
                    <span className="text-[13px] text-ink-soft">{m.name}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <button onClick={() => copy(loginId(m))} className="flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-[12px] text-muted hover:bg-surface-2">{copied === loginId(m) ? <Check size={13} className="text-success" /> : <Copy size={13} />} 아이디</button>
                      <button onClick={() => { setResetFor(resetFor === m.id ? null : m.id); setResetPw(""); }} className="flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-[12px] text-muted hover:bg-surface-2"><KeyRound size={13} /> 비번</button>
                      <button onClick={() => removeStaff(m.id, loginId(m))} title="삭제" className="flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-surface-2 hover:text-danger"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {resetFor === m.id && (
                    <div className="mt-2 flex gap-1.5">
                      <Input value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="새 비밀번호(6자 이상)" />
                      <Button size="sm" onClick={() => resetPassword(m.id)} disabled={busy}>변경</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[11.5px] text-faint">※ 직원 권한은 위 ‘사무소 멤버’ 목록에서 부여합니다. 좌석 자동 한도·결제는 결제 연동 후 적용됩니다.</p>
      </div>
    </Card>
  );
}
