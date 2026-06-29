"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { UploadCloud, Loader2, CheckCircle2, FileText, CalendarClock, ClipboardList } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Card, Badge } from "@/components/ui";
import { stageLabel, caseTypeLabel, formatDate } from "@/lib/format";
import { DOC_MASTER } from "@/lib/docChecklist";

interface ShareData {
  caseId: string; clientName: string | null; type: string; stage: string; status: string;
  court: string; caseNo: string | null;
  events: { title: string; date: string; type: string }[];
  docChecks: { docKey: string; status: string }[];
}

const DOC_NAME: Record<string, string> = Object.fromEntries(DOC_MASTER.map((d) => [d.key, d.name]));
const STATUS_TONE: Record<string, string> = { done: "success", requested: "warning", todo: "muted", na: "muted" };
const STATUS_LABEL: Record<string, string> = { done: "완료", requested: "요청됨", todo: "준비 필요", na: "해당없음" };
const uid = () => `${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
const safeKey = (n: string) => n.replace(/[^\w.\-]+/g, "_").slice(-80);

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null | "invalid">(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) { setData("invalid"); return; }
    const { data: d, error } = await sb.rpc("share_view", { p_token: token });
    if (error || !d) setData("invalid"); else setData(d as ShareData);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true); setErr(null);
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) { setErr(`‘${file.name}’은 25MB를 초과합니다.`); continue; }
      const path = `${token}/${uid()}-${safeKey(file.name)}`;
      const { error } = await sb.storage.from("client-uploads").upload(path, file, { contentType: file.type || undefined });
      if (error) { setErr("업로드에 실패했습니다. 잠시 후 다시 시도해주세요."); continue; }
      await sb.rpc("share_submit", { p_token: token, p_name: file.name, p_path: path, p_size: file.size });
      setDone((d) => [...d, file.name]);
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (data === null) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas text-muted"><Loader2 className="mr-2 animate-spin" size={18} /> 불러오는 중…</div>;
  }
  if (data === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="text-center">
          <div className="text-lg font-bold text-ink">유효하지 않은 링크입니다</div>
          <p className="mt-1 text-[13px] text-muted">담당 사무소에 다시 문의해 주세요.</p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = data.events.filter((e) => e.date >= today);
  const pendingDocs = data.docChecks.filter((d) => d.status === "todo" || d.status === "requested");

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Insight Restart" className="h-11 w-11 rounded-2xl" />
          <div>
            <div className="text-lg font-extrabold tracking-tight text-ink">{data.clientName ? `${data.clientName}님` : "의뢰인"} 사건 진행 안내</div>
            <div className="text-[12.5px] text-muted">{(caseTypeLabel as Record<string, string>)[data.type] ?? data.type} · {data.court}{data.caseNo ? ` · ${data.caseNo}` : ""}</div>
          </div>
        </div>

        <Card>
          <div className="border-b border-line-soft px-5 py-3 text-[13px] font-bold text-ink">현재 진행 단계</div>
          <div className="flex items-center gap-2 p-5">
            <Badge tone="brand">{(stageLabel as Record<string, string>)[data.stage] ?? data.stage}</Badge>
            <span className="text-[13px] text-muted">{data.status === "active" ? "진행 중" : data.status}</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 border-b border-line-soft px-5 py-3 text-[13px] font-bold text-ink"><CalendarClock size={15} className="text-brand" /> 다가오는 일정</div>
          {upcoming.length === 0 ? (
            <div className="px-5 py-6 text-center text-[13px] text-muted">예정된 일정이 없습니다.</div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {upcoming.map((e, i) => (
                <li key={i} className="flex items-center justify-between px-5 py-3 text-[13px]">
                  <span className="text-ink">{e.title}</span>
                  <span className="tabular-nums text-muted">{formatDate(e.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 border-b border-line-soft px-5 py-3 text-[13px] font-bold text-ink"><ClipboardList size={15} className="text-brand" /> 준비할 서류</div>
          {pendingDocs.length === 0 ? (
            <div className="px-5 py-6 text-center text-[13px] text-muted">준비할 서류가 없습니다.</div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {pendingDocs.map((d, i) => (
                <li key={i} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
                  <span className="text-ink">{DOC_NAME[d.docKey] ?? d.docKey}</span>
                  <Badge tone={STATUS_TONE[d.status] as never}>{STATUS_LABEL[d.status] ?? d.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 border-b border-line-soft px-5 py-3 text-[13px] font-bold text-ink"><FileText size={15} className="text-brand" /> 서류 제출</div>
          <div className="space-y-2 p-5">
            <div
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line px-4 py-7 text-center hover:border-brand-300 hover:bg-surface-2"
            >
              {busy ? <Loader2 size={24} className="animate-spin text-brand" /> : <UploadCloud size={24} className="text-brand" />}
              <div className="text-[13px] font-medium text-ink">{busy ? "업로드 중…" : "여기를 눌러 파일을 선택하세요"}</div>
              <div className="text-[11.5px] text-faint">사진·PDF 등 · 파일당 최대 25MB</div>
              <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            </div>
            {err && <p className="text-[12px] text-danger">{err}</p>}
            {done.length > 0 && (
              <ul className="space-y-1">
                {done.map((n, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[12.5px] text-success"><CheckCircle2 size={13} /> {n} 제출 완료</li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <p className="text-center text-[11.5px] text-faint">제출하신 서류는 담당 사무소에서 확인합니다 · Insight Restart</p>
      </div>
    </div>
  );
}
