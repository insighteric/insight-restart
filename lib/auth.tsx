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
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, firmName: string, name: string, phone: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  findEmail: (name: string, phone: string) => Promise<{ email?: string | null; error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = supabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [firmId, setFirmId] = useState<string | null>(null);
  const [firmName, setFirmName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [superAdmin, setSuperAdmin] = useState(false);

  const loadFirm = useCallback(async (u: User | null) => {
    const sb = getSupabase();
    if (!sb || !u) {
      setFirmId(null);
      setFirmName(null);
      setRole(null);
      setPermissions([]);
      setSuperAdmin(false);
      setTrackContext(null, null);
      return;
    }
    try {
      const { data } = await sb
        .from("members")
        .select("firm_id, role, permissions, super_admin, firms(name)")
        .eq("id", u.id)
        .single();
      if (data) {
        setTrackContext(data.firm_id as string, u.id);
        setFirmId(data.firm_id as string);
        setRole((data.role as string) ?? "staff");
        setPermissions(Array.isArray(data.permissions) ? (data.permissions as string[]) : []);
        setSuperAdmin(!!data.super_admin);
        const firms = data.firms as unknown as { name?: string } | { name?: string }[] | null;
        const name = Array.isArray(firms) ? firms[0]?.name : firms?.name;
        setFirmName(name ?? null);
      }
    } catch {
      // 멤버 조회 실패해도 로그인 자체는 유지(로딩이 멈추지 않도록)
    }
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
  }, [loadFirm]);

  const signIn: AuthApi["signIn"] = async (email, password) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signUp: AuthApi["signUp"] = async (email, password, firm, name, phone) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { firm_name: firm, name, phone } },
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

  const signOut = async () => {
    const sb = getSupabase();
    await sb?.auth.signOut();
    setUser(null);
    setFirmId(null);
    setFirmName(null);
    setRole(null);
    setPermissions([]);
    setSuperAdmin(false);
    setTrackContext(null, null);
  };

  // 데모(Supabase 미설정)에선 관리자 권한 부여, 그 외엔 owner만 관리자
  const isAdmin = !configured || role === "owner";
  const can = (key: string) => isAdmin || permissions.includes(key);

  return (
    <Ctx.Provider value={{ configured, loading, user, firmId, firmName, role, isAdmin, permissions, can, superAdmin, signIn, signUp, updatePassword, resetPassword, findEmail, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
