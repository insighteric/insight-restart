"use client";

import { getSupabase } from "./supabase";

export interface PlatformBaseline {
  medianIncomeByHousehold: Record<number, number>;
  livingCostRatio: number;
  baseYear: number;
}

// 운영자가 중앙 관리하는 권장 기준값(기준 중위소득 등). 전 사무소 공통.
export async function fetchPlatformBaseline(): Promise<PlatformBaseline | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("platform_settings").select("data").eq("id", 1).maybeSingle();
  return (data?.data as PlatformBaseline) ?? null;
}

// 운영자: 저장(슈퍼관리자만, RLS로 강제)
export async function savePlatformBaseline(b: PlatformBaseline): Promise<{ error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase 미설정" };
  const { error } = await sb.from("platform_settings").upsert({ id: 1, data: b, updated_at: new Date().toISOString() });
  return error ? { error: error.message } : {};
}
