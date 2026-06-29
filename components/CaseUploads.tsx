"use client";

import { useRef, useState } from "react";
import { UploadCloud, File as FileIcon, Download, Trash2, Loader2, Paperclip } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import type { CaseUpload } from "@/lib/types";

const BUCKET = "case-files";
const uid = () => `${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
const safeKey = (name: string) => name.replace(/[^\w.\-]+/g, "_").slice(-80);

export function CaseUploads({ caseId, docKey, compact }: { caseId: string; docKey?: string; compact?: boolean }) {
  const store = useStore();
  const { firmId, configured } = useAuth();
  const files = store.uploadsForCase(caseId).filter((u) => (docKey ? u.docKey === docKey : true));
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUpload = configured && !!firmId;

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
      const meta: CaseUpload = {
        id, caseId, name: file.name, path, size: file.size,
        mime: file.type || "application/octet-stream", docKey,
        uploadedAt: new Date().toISOString(),
      };
      store.addUpload(meta);
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
      {!compact && <div className="text-[11.5px] text-faint">PDF·이미지·한글·엑셀 등 · 파일당 최대 25MB · 여러 개 동시 가능</div>}
      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => doUpload(e.target.files)} />
    </div>
  );

  const fileList = files.length > 0 && (
    <ul className="divide-y divide-line-soft">
      {files.map((u) => (
        <li key={u.id} className="flex items-center gap-3 px-1 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted"><FileIcon size={15} /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-ink">{u.name}</div>
            <div className="text-[11px] text-faint">{fmtSize(u.size)} · {u.uploadedAt.slice(0, 10)}</div>
          </div>
          <button onClick={() => download(u)} title="다운로드" className="flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-surface-2 hover:text-brand-700"><Download size={15} /></button>
          <button onClick={() => remove(u)} title="삭제" className="flex h-8 w-8 items-center justify-center rounded-lg text-faint hover:bg-surface-2 hover:text-danger"><Trash2 size={15} /></button>
        </li>
      ))}
    </ul>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        {dropZone}
        {err && <p className="text-[12px] text-danger">{err}</p>}
        {fileList}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader title="첨부 서류 (업로드)" desc={`의뢰인·기관에서 받은 파일을 보관합니다 · ${files.length}개`} />
      <div className="space-y-3 p-5">
        {!canUpload && <div className="rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] text-muted">※ 로그인하면 사건별로 파일을 안전하게 업로드·보관할 수 있습니다.</div>}
        {dropZone}
        {err && <p className="text-[12px] text-danger">{err}</p>}
        {files.length === 0 ? (
          <EmptyState icon={<Paperclip size={26} />} title="첨부된 서류가 없습니다" desc="신분증·소득서류·신용정보조회서·부채증명서 등 받은 서류를 올려두세요." />
        ) : fileList}
      </div>
    </Card>
  );
}
