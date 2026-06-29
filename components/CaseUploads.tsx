"use client";

import { useMemo, useRef, useState } from "react";
import { UploadCloud, File as FileIcon, Download, Trash2, Loader2, Paperclip } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { track } from "@/lib/track";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import type { CaseUpload, UploadCategory } from "@/lib/types";

const BUCKET = "case-files";
const uid = () => `${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
const safeKey = (name: string) => name.replace(/[^\w.\-]+/g, "_").slice(-80);

const UPLOAD_CATS: { key: UploadCategory; label: string }[] = [
  { key: "client", label: "신분·가족" },
  { key: "income", label: "소득" },
  { key: "asset", label: "재산" },
  { key: "creditor", label: "채권·부채" },
  { key: "court", label: "법원" },
  { key: "evidence", label: "증거·소명" },
  { key: "etc", label: "기타" },
];
const CAT_LABEL: Record<string, string> = Object.fromEntries(UPLOAD_CATS.map((c) => [c.key, c.label]));

// 파일명으로 분류 자동 추정
function guessCategory(name: string): UploadCategory {
  const s = name;
  if (/결정|명령|법원|송달|판결|개시|인가|면책|보정/.test(s)) return "court";
  if (/신용정보|부채증명|채권|대출|카드|금융|차용|대부/.test(s)) return "creditor";
  if (/소득|급여|근로|원천징수|재직|건강보험|국민연금|사업소득|위촉|연금/.test(s)) return "income";
  if (/등기|부동산|자동차|차량|전세|임대차|보증금|보험|예금|잔고|시가|감정|통장/.test(s)) return "asset";
  if (/신분증|주민등록|가족관계|혼인|초본|등본|기본증명/.test(s)) return "client";
  if (/진술|소명|증거|사진|확인서|탄원/.test(s)) return "evidence";
  return "etc";
}

const selCls = "h-7 rounded-md border border-line bg-surface px-1.5 text-[11.5px] text-ink-soft outline-none focus:border-brand-300";

export function CaseUploads({ caseId, docKey, compact }: { caseId: string; docKey?: string; compact?: boolean }) {
  const store = useStore();
  const { firmId, configured } = useAuth();
  const allFiles = store.uploadsForCase(caseId).filter((u) => (docKey ? u.docKey === docKey : true));
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pickCat, setPickCat] = useState<UploadCategory | "auto">("auto");
  const [filter, setFilter] = useState<UploadCategory | "all">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const canUpload = configured && !!firmId;
  const files = useMemo(() => (filter === "all" ? allFiles : allFiles.filter((u) => (u.category ?? "etc") === filter)), [allFiles, filter]);
  const usedCats = useMemo(() => UPLOAD_CATS.filter((c) => allFiles.some((u) => (u.category ?? "etc") === c.key)), [allFiles]);

  const doUpload = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    if (!canUpload) { setErr("로그인 후 업로드할 수 있습니다."); return; }
    const sb = getSupabase();
    if (!sb) { setErr("저장소에 연결할 수 없습니다."); return; }
    setBusy(true); setErr(null);
    for (const file of Array.from(list)) {
      if (file.size > 25 * 1024 * 1024) { setErr(`‘${file.name}’은 25MB를 초과합니다.`); continue; }
      const id = uid();
      const path = `${firmId}/${caseId}/${id}-${safeKey(file.name)}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) { setErr(error.message); continue; }
      const category = pickCat === "auto" ? guessCategory(file.name) : pickCat;
      const meta: CaseUpload = {
        id, caseId, name: file.name, path, size: file.size,
        mime: file.type || "application/octet-stream", docKey, category,
        uploadedAt: new Date().toISOString(),
      };
      store.addUpload(meta);
      track("upload", { caseId });
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const download = async (u: CaseUpload) => {
    const sb = getSupabase();
    if (!sb) return;
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(u.path, 120, { download: u.name });
    if (error || !data) { setErr(error?.message ?? "다운로드 링크 생성 실패"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (u: CaseUpload) => {
    const sb = getSupabase();
    if (sb) await sb.storage.from(BUCKET).remove([u.path]);
    store.removeUpload(u.id);
  };

  const dropZone = (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); doUpload(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 ${compact ? "py-4" : "py-7"} text-center transition-colors ${
        drag ? "border-brand bg-brand-50" : "border-line hover:border-brand-300 hover:bg-surface-2"
      }`}
    >
      {busy ? <Loader2 size={compact ? 18 : 24} className="animate-spin text-brand" /> : <UploadCloud size={compact ? 18 : 24} className="text-brand" />}
      <div className="text-[13px] font-medium text-ink">
        {busy ? "업로드 중…" : "파일을 여기로 끌어다 놓거나 클릭해 선택"}
      </div>
      {!compact && <div className="text-[11.5px] text-faint">파일명으로 자동 분류 · 파일당 최대 25MB · 여러 개 동시 가능</div>}
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => doUpload(e.target.files)} />
    </div>
  );

  const fileRow = (u: CaseUpload) => (
    <li key={u.id} className="flex items-center gap-2 px-1 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted"><FileIcon size={15} /></div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{u.name}</div>
        <div className="text-[11px] text-faint">{fmtSize(u.size)} · {u.uploadedAt.slice(0, 10)}</div>
      </div>
      <select value={u.category ?? "etc"} onChange={(e) => store.updateUpload(u.id, { category: e.target.value as UploadCategory })} className={selCls} title="분류 변경">
        {UPLOAD_CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <button onClick={() => download(u)} title="다운로드" className="flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-surface-2 hover:text-brand-700"><Download size={15} /></button>
      <button onClick={() => remove(u)} title="삭제" className="flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-surface-2 hover:text-danger"><Trash2 size={15} /></button>
    </li>
  );

  const catPicker = (
    <div className="flex items-center gap-1.5 text-[12px]">
      <span className="text-faint">분류:</span>
      <select value={pickCat} onChange={(e) => setPickCat(e.target.value as UploadCategory | "auto")} className="h-8 rounded-lg border border-line bg-surface px-2 text-[12.5px] text-ink-soft outline-none focus:border-brand-300">
        <option value="auto">자동(파일명 추정)</option>
        {UPLOAD_CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        {dropZone}
        {err && <p className="text-[12px] text-danger">{err}</p>}
        {allFiles.length > 0 && <ul className="divide-y divide-line-soft">{allFiles.map(fileRow)}</ul>}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader title="첨부 서류 (업로드)" desc={`의뢰인·기관에서 받은 파일을 분류해 보관합니다 · ${allFiles.length}개`} action={catPicker} />
      <div className="space-y-3 p-5">
        {!canUpload && <div className="rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] text-muted">※ 로그인하면 사건별로 파일을 안전하게 업로드·보관할 수 있습니다.</div>}
        {dropZone}
        {err && <p className="text-[12px] text-danger">{err}</p>}
        {allFiles.length === 0 ? (
          <EmptyState icon={<Paperclip size={26} />} title="첨부된 서류가 없습니다" desc="신분증·소득서류·신용정보조회서·부채증명서 등 받은 서류를 올려두세요. 파일명으로 자동 분류됩니다." />
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setFilter("all")} className={`rounded-md border px-2 py-0.5 text-[11.5px] font-medium ${filter === "all" ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"}`}>전체 {allFiles.length}</button>
              {usedCats.map((c) => {
                const n = allFiles.filter((u) => (u.category ?? "etc") === c.key).length;
                return <button key={c.key} onClick={() => setFilter(c.key)} className={`rounded-md border px-2 py-0.5 text-[11.5px] font-medium ${filter === c.key ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-surface-2"}`}>{c.label} {n}</button>;
              })}
            </div>
            <ul className="divide-y divide-line-soft">{files.map(fileRow)}</ul>
          </>
        )}
      </div>
    </Card>
  );
}
