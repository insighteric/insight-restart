"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { getSupabase } from "./supabase";
import { useAuth } from "./auth";
import type {
  Case,
  Client,
  Correction,
  CaseDocument,
  ScheduleEvent,
  Subscription,
  Settings,
} from "./types";
import {
  seedCases,
  seedClients,
  seedCorrections,
  seedDocuments,
  seedEvents,
  seedSubscription,
} from "./seed";
import { DEFAULT_SETTINGS } from "./calc";

interface DB {
  clients: Client[];
  cases: Case[];
  corrections: Correction[];
  documents: CaseDocument[];
  events: ScheduleEvent[];
  subscription: Subscription;
  settings: Settings;
}

const initial: DB = {
  clients: seedClients,
  cases: seedCases,
  corrections: seedCorrections,
  documents: seedDocuments,
  events: seedEvents,
  subscription: seedSubscription,
  settings: DEFAULT_SETTINGS,
};

interface StoreApi extends DB {
  ready: boolean;
  clientById: (id: string) => Client | undefined;
  caseById: (id: string) => Case | undefined;
  correctionsForCase: (caseId: string) => Correction[];
  documentsForCase: (caseId: string) => CaseDocument[];
  eventsForCase: (caseId: string) => ScheduleEvent[];
  addCorrection: (c: Correction) => void;
  updateCorrection: (id: string, patch: Partial<Correction>) => void;
  addDocument: (d: CaseDocument) => void;
  updateDocument: (id: string, patch: Partial<CaseDocument>) => void;
  addEvent: (e: ScheduleEvent) => void;
  updateEvent: (id: string, patch: Partial<ScheduleEvent>) => void;
  updateCase: (id: string, patch: Partial<Case>) => void;
  addCase: (c: Case) => void;
  addClient: (c: Client) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const Ctx = createContext<StoreApi | null>(null);
const KEY = "hoesaeng_db_v1";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [db, setDb] = useState<DB>(initial);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const useCloud = auth.configured && !!auth.user && !!auth.firmId;

  // 로드: 로그인 시 Supabase(app_state), 아니면 localStorage
  useEffect(() => {
    if (auth.loading) return;
    let cancelled = false;
    (async () => {
      if (useCloud) {
        const sb = getSupabase();
        const { data } = await sb!.from("app_state").select("data").eq("firm_id", auth.firmId).maybeSingle();
        if (cancelled) return;
        const cloud = data?.data as Partial<DB> | undefined;
        if (cloud && Object.keys(cloud).length > 0) {
          setDb({ ...initial, ...cloud });
        } else {
          // 최초 로그인: 데모 시드를 사무소 데이터로 저장
          setDb(initial);
          await sb!.from("app_state").upsert({ firm_id: auth.firmId, data: initial, updated_at: new Date().toISOString() });
        }
      } else if (!auth.configured) {
        try {
          const raw = localStorage.getItem(KEY);
          if (raw) setDb({ ...initial, ...JSON.parse(raw) });
        } catch {
          /* ignore */
        }
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.configured, auth.user, auth.firmId]);

  // 저장: 디바운스 후 Supabase 또는 localStorage
  useEffect(() => {
    if (!ready) return;
    if (useCloud) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const sb = getSupabase();
        sb?.from("app_state")
          .upsert({ firm_id: auth.firmId, data: db, updated_at: new Date().toISOString() })
          .then(() => {});
      }, 700);
    } else if (!auth.configured) {
      try {
        localStorage.setItem(KEY, JSON.stringify(db));
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, ready]);

  const api: StoreApi = {
    ...db,
    ready,
    clientById: (id) => db.clients.find((c) => c.id === id),
    caseById: (id) => db.cases.find((c) => c.id === id),
    correctionsForCase: (caseId) => db.corrections.filter((c) => c.caseId === caseId),
    documentsForCase: (caseId) => db.documents.filter((d) => d.caseId === caseId),
    eventsForCase: (caseId) => db.events.filter((e) => e.caseId === caseId),
    addCorrection: (c) => setDb((s) => ({ ...s, corrections: [c, ...s.corrections] })),
    updateCorrection: (id, patch) =>
      setDb((s) => ({
        ...s,
        corrections: s.corrections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      })),
    addDocument: (d) => setDb((s) => ({ ...s, documents: [d, ...s.documents] })),
    updateDocument: (id, patch) =>
      setDb((s) => ({
        ...s,
        documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      })),
    addEvent: (e) => setDb((s) => ({ ...s, events: [e, ...s.events] })),
    updateEvent: (id, patch) =>
      setDb((s) => ({
        ...s,
        events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      })),
    updateCase: (id, patch) =>
      setDb((s) => ({
        ...s,
        cases: s.cases.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      })),
    addCase: (c) => setDb((s) => ({ ...s, cases: [c, ...s.cases] })),
    addClient: (c) => setDb((s) => ({ ...s, clients: [c, ...s.clients] })),
    updateSettings: (patch) => setDb((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    reset: () => setDb(initial),
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
