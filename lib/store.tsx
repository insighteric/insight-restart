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
  FeePlan,
  CaseLog,
  CaseDocCheck,
  Referral,
  CaseUpload,
} from "./types";
import {
  seedCases,
  seedClients,
  seedCorrections,
  seedDocuments,
  seedEvents,
  seedSubscription,
  seedFeePlans,
  seedCaseLogs,
  seedDocChecks,
  seedReferrals,
} from "./seed";
import { DEFAULT_SETTINGS } from "./calc";

interface DB {
  clients: Client[];
  cases: Case[];
  corrections: Correction[];
  documents: CaseDocument[];
  events: ScheduleEvent[];
  feePlans: FeePlan[];
  caseLogs: CaseLog[];
  docChecks: CaseDocCheck[];
  referrals: Referral[];
  uploads: CaseUpload[];
  subscription: Subscription;
  settings: Settings;
}

const initial: DB = {
  clients: seedClients,
  cases: seedCases,
  corrections: seedCorrections,
  documents: seedDocuments,
  events: seedEvents,
  feePlans: seedFeePlans,
  caseLogs: seedCaseLogs,
  docChecks: seedDocChecks,
  referrals: seedReferrals,
  uploads: [],
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
  feePlanForCase: (caseId: string) => FeePlan | undefined;
  logsForCase: (caseId: string) => CaseLog[];
  addFeePlan: (p: FeePlan) => void;
  updateFeePlan: (id: string, patch: Partial<FeePlan>) => void;
  removeFeePlan: (id: string) => void;
  addCaseLog: (l: CaseLog) => void;
  updateCaseLog: (id: string, patch: Partial<CaseLog>) => void;
  removeCaseLog: (id: string) => void;
  docChecksForCase: (caseId: string) => CaseDocCheck[];
  setDocCheck: (caseId: string, docKey: string, patch: Partial<CaseDocCheck>) => void;
  uploadsForCase: (caseId: string) => CaseUpload[];
  addUpload: (u: CaseUpload) => void;
  removeUpload: (id: string) => void;
  referralForCase: (caseId: string) => Referral | undefined;
  addReferral: (r: Referral) => void;
  updateReferral: (id: string, patch: Partial<Referral>) => void;
  removeReferral: (id: string) => void;
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
      try {
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
          const raw = localStorage.getItem(KEY);
          if (raw) setDb({ ...initial, ...JSON.parse(raw) });
        }
      } catch {
        // 로드 실패 시에도 앱은 시드 데이터로 동작(멈추지 않도록)
      } finally {
        if (!cancelled) setReady(true);
      }
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
    feePlanForCase: (caseId) => db.feePlans.find((p) => p.caseId === caseId),
    logsForCase: (caseId) =>
      db.caseLogs.filter((l) => l.caseId === caseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    addFeePlan: (p) => setDb((s) => ({ ...s, feePlans: [p, ...s.feePlans] })),
    updateFeePlan: (id, patch) =>
      setDb((s) => ({ ...s, feePlans: s.feePlans.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    removeFeePlan: (id) => setDb((s) => ({ ...s, feePlans: s.feePlans.filter((p) => p.id !== id) })),
    addCaseLog: (l) => setDb((s) => ({ ...s, caseLogs: [l, ...s.caseLogs] })),
    updateCaseLog: (id, patch) =>
      setDb((s) => ({ ...s, caseLogs: s.caseLogs.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
    removeCaseLog: (id) => setDb((s) => ({ ...s, caseLogs: s.caseLogs.filter((l) => l.id !== id) })),
    docChecksForCase: (caseId) => db.docChecks.filter((d) => d.caseId === caseId),
    setDocCheck: (caseId, docKey, patch) =>
      setDb((s) => {
        const existing = s.docChecks.find((d) => d.caseId === caseId && d.docKey === docKey);
        if (existing) {
          return { ...s, docChecks: s.docChecks.map((d) => (d.id === existing.id ? { ...d, ...patch } : d)) };
        }
        const created: CaseDocCheck = {
          id: `dc_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`,
          caseId,
          docKey,
          status: "todo",
          ...patch,
        };
        return { ...s, docChecks: [created, ...s.docChecks] };
      }),
    uploadsForCase: (caseId) =>
      db.uploads.filter((u) => u.caseId === caseId).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    addUpload: (u) => setDb((s) => ({ ...s, uploads: [u, ...(s.uploads ?? [])] })),
    removeUpload: (id) => setDb((s) => ({ ...s, uploads: (s.uploads ?? []).filter((u) => u.id !== id) })),
    referralForCase: (caseId) => db.referrals.find((r) => r.caseId === caseId),
    addReferral: (r) => setDb((s) => ({ ...s, referrals: [r, ...s.referrals] })),
    updateReferral: (id, patch) =>
      setDb((s) => ({ ...s, referrals: s.referrals.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
    removeReferral: (id) => setDb((s) => ({ ...s, referrals: s.referrals.filter((r) => r.id !== id) })),
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
