"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";
import { setTrackContext, track } from "./track";

interface AuthApi {
  configured: boolean;
  loading: boolean;
  user: User | null;
  firmId: string | null;
  firmName: string | null;
  role: string | null; // owner | staff
  isAdmin: boolean; // owner 또는 데모(미설정) 시 true
  permissions: string[];
  can: (key: string) => boolean; // owner/데모 → 항상 true
  superAdmin: boolean; // 플랫폼 운영자(전체 회원·구독 관리)
  firmStatus: string | null; // approved | pending | rejected
  memberName: string | null; // 현재 로그인 직원 이름(담당 사건 필터용)
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, firmName: string, name: string, phone: string, orgType?: "individual" | "org", inviteCode?: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  findEmail: (name: string, phone: string) => Promise<{ email?: string | null; error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthApi | null>(null);

// 마지막 성공 권한을 로컬에 캐시 → 재접속 시 깜빡임 없이 즉시 표시(서버 조회로 갱신)
const AUTH_CACHE = "ir_auth_v1";
interface AuthCache { uid: string; firmId: string | null; role: string | null; permissions: string[]; superAdmin: boolean; name: string | null; firmName: string | null; firmStatus: string }
function loadCache(): AuthCache | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(AUTH_CACHE) || "null"); } catch { return null; }
}
function saveCache(c: AuthCache) { try { localStorage.setItem(AUTH_CACHE, JSON.stringify(c)); } catch { /* ignore */ } }
function clearCache() { try { localStorage.removeItem(AUTH_CACHE); } catch { /* ignore */ } }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = supabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [firmId, setFirmId] = useState<string | null>(null);
  const [firmName, setFirmName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [firmStatus, setFirmStatus] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);

  const loadFirm = useCallback(async (u: User | null) => {
    const sb = getSupabase();
    if (!sb || !u) {
      setFirmId(null);
      setFirmName(null);
      setRole(null);
      setPermissions([]);
      setSuperAdmin(false);
      setFirmStatus(null);
      setMemberName(null);
      setTrackContext(null, null);
      clearCache();
      return;
    }
    try {
      // 1) 멤버 본인 정보(권한·운영자 플래그) — 사무소 조회와 분리해 견고하게
      const fetchMember = () =>
        sb.from("members").select("firm_id, role, permissions, super_admin, name").eq("id", u.id).maybeSingle();
      let { data, error } = await fetchMember();
      // 세션 토큰이 만료돼 비인증으로 처리되면(행 없음/JWT 오류) 토큰 갱신 후 1회 재시도
      if ((!data || error) && u) {
        try { await sb.auth.refreshSession(); } catch { /* ignore */ }
        ({ data, error } = await fetchMember());
      }
      if (data) {
        const role = (data.role as string) ?? "staff";
        const perms = Array.isArray(data.permissions) ? (data.permissions as string[]) : [];
        const sAdmin = !!data.super_admin;
        const mName = (data.name as string) ?? null;
        setTrackContext(data.firm_id as string, u.id);
        setFirmId(data.firm_id as string);
        setRole(role);
        setPermissions(perms);
        setSuperAdmin(sAdmin);
        setMemberName(mName);
        // 2) 사무소 이름·승인상태(실패해도 권한엔 영향 없음)
        let fName: string | null = null;
        let fStatus = "approved";
        try {
          const { data: f } = await sb.from("firms").select("name, status").eq("id", data.firm_id as string).maybeSingle();
          fName = (f?.name as string) ?? null;
          fStatus = (f?.status as string) ?? "approved";
          setFirmName(fName);
          setFirmStatus(fStatus);
        } catch {
          setFirmStatus("approved");
        }
        saveCache({ uid: u.id, firmId: data.firm_id as string, role, permissions: perms, superAdmin: sAdmin, name: mName, firmName: fName, firmStatus: fStatus });
      }
    } catch {
      // 멤버 조회 실패해도 로그인 자체는 유지(로딩이 멈추지 않도록)
    }
  }, []);

  // 캐시된 권한을 즉시 반영(같은 사용자일 때만) → 깜빡임 방지
  const applyCache = useCallback((uid: string) => {
    const c = loadCache();
    if (!c || c.uid !== uid) return;
    setFirmId(c.firmId ?? null);
    setRole(c.role ?? null);
    setPermissions(c.permissions ?? []);
    setSuperAdmin(!!c.superAdmin);
    setFirmName(c.firmName ?? null);
    setFirmStatus(c.firmStatus ?? "approved");
    setMemberName(c.name ?? null);
    setTrackContext(c.firmId ?? null, uid);
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    // 어떤 경우에도 로딩이 영구히 걸리지 않도록 안전장치(8초)
    const safety = setTimeout(() => setLoading(false), 8000);
    sb.auth
      .getSession()
      .then(async ({ data }) => {
        const u = data.session?.user ?? null;
        setUser(u);
        if (u) applyCache(u.id);
        await loadFirm(u);
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(safety);
        setLoading(false);
      });
    const { data: sub } = sb.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) applyCache(u.id);
      await loadFirm(u);
      if (u) {
        if (event === "SIGNED_IN") track("login");
        else if (event === "INITIAL_SESSION") track("visit");
      }
    });
    return () => {
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, [loadFirm, applyCache]);

  const signIn: AuthApi["signIn"] = async (email, password) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    // 직원 아이디(이메일 형식이 아님)면 합성 이메일로 변환해 로그인
    const id = email.trim();
    const loginEmail = id.includes("@")
      ? id
      : `${id.toLowerCase().replace(/[^a-z0-9.\-_]/g, "")}@staff.insightrestart.app`;
    const { error } = await sb.auth.signInWithPassword({ email: loginEmail, password });
    return error ? { error: error.message } : {};
  };

  const signUp: AuthApi["signUp"] = async (email, password, firm, name, phone, orgType = "individual", inviteCode) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { firm_name: firm, name, phone, org_type: orgType, invite_code: inviteCode?.trim() || undefined } },
    });
    return error ? { error: error.message } : {};
  };

  const resetPassword: AuthApi["resetPassword"] = async (email) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    return error ? { error: error.message } : {};
  };

  const findEmail: AuthApi["findEmail"] = async (name, phone) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const { data, error } = await sb.rpc("find_email_by_name_phone", { p_name: name, p_phone: phone });
    if (error) return { error: error.message };
    return { email: (data as string | null) ?? null };
  };

  const updatePassword: AuthApi["updatePassword"] = async (newPassword) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const { error } = await sb.auth.updateUser({ password: newPassword });
    return error ? { error: error.message } : {};
  };

  const deleteAccount: AuthApi["deleteAccount"] = async () => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const { error } = await sb.rpc("delete_my_account");
    if (error) {
      if (error.message === "transfer_owner_first") return { error: "다른 직원이 있는 사무소입니다. 먼저 다른 직원에게 관리자(대표)를 위임한 뒤 탈퇴하세요." };
      return { error: error.message };
    }
    await signOut(); // 로컬 세션·캐시 정리 후 /login 이동
    return {};
  };

  const signOut = async () => {
    const sb = getSupabase();
    // signOut이 네트워크로 멈춰도 최대 1.5초 후 진행
    try {
      await Promise.race([
        sb?.auth.signOut().then(() => {}) ?? Promise.resolve(),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
    } catch {
      /* ignore */
    }
    // 로컬 세션 토큰까지 확실히 제거(키 이름이 바뀌어도 supabase 항목 모두 정리)
    try {
      if (typeof window !== "undefined") {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k);
        });
      }
    } catch {
      /* ignore */
    }
    setUser(null);
    setFirmId(null);
    setFirmName(null);
    setRole(null);
    setPermissions([]);
    setSuperAdmin(false);
    setFirmStatus(null);
    setMemberName(null);
    setTrackContext(null, null);
    clearCache();
    // 완전 새로고침으로 로그인 화면 이동(잔여 상태 제거)
    if (typeof window !== "undefined") window.location.href = "/login";
  };

  // 데모(Supabase 미설정)에선 관리자 권한 부여, 그 외엔 owner만 관리자
  const isAdmin = !configured || role === "owner";
  const can = (key: string) => isAdmin || permissions.includes(key);

  return (
    <Ctx.Provider value={{ configured, loading, user, firmId, firmName, role, isAdmin, permissions, can, superAdmin, firmStatus, memberName, signIn, signUp, updatePassword, resetPassword, findEmail, deleteAccount, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
