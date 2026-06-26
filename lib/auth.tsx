"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";

interface AuthApi {
  configured: boolean;
  loading: boolean;
  user: User | null;
  firmId: string | null;
  firmName: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, firmName: string, name: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = supabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [firmId, setFirmId] = useState<string | null>(null);
  const [firmName, setFirmName] = useState<string | null>(null);

  const loadFirm = useCallback(async (u: User | null) => {
    const sb = getSupabase();
    if (!sb || !u) {
      setFirmId(null);
      setFirmName(null);
      return;
    }
    const { data } = await sb
      .from("members")
      .select("firm_id, firms(name)")
      .eq("id", u.id)
      .single();
    if (data) {
      setFirmId(data.firm_id as string);
      const firms = data.firms as unknown as { name?: string } | { name?: string }[] | null;
      const name = Array.isArray(firms) ? firms[0]?.name : firms?.name;
      setFirmName(name ?? null);
    }
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    sb.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      await loadFirm(u);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      await loadFirm(u);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadFirm]);

  const signIn: AuthApi["signIn"] = async (email, password) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signUp: AuthApi["signUp"] = async (email, password, firm, name) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase 미설정" };
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { firm_name: firm, name } },
    });
    return error ? { error: error.message } : {};
  };

  const signOut = async () => {
    const sb = getSupabase();
    await sb?.auth.signOut();
    setUser(null);
    setFirmId(null);
    setFirmName(null);
  };

  return (
    <Ctx.Provider value={{ configured, loading, user, firmId, firmName, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
