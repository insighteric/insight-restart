"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "./supabase";

export interface Announcement {
  id: number;
  kind: "notice" | "banner";
  title: string | null;
  body: string | null;
  link: string | null;
  tone: string | null;
  active: boolean;
  created_at: string;
}

// 활성 공지/배너 조회(전체 사용자). 미설정/비로그인 시 빈 배열.
export function useAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let on = true;
    sb.from("announcements")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (on && data) setItems(data as Announcement[]);
      });
    return () => { on = false; };
  }, []);
  return items;
}

// 운영자: 전체(비활성 포함) 조회 + 저장/삭제
export function useAdminAnnouncements() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) { setErr("로그인이 필요합니다."); return; }
    const { data, error } = await sb.from("announcements").select("*").order("created_at", { ascending: false });
    if (error) setErr(error.message); else setItems((data ?? []) as Announcement[]);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { items, err, reload: load, setErr };
}
