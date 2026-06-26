"use client";

import { useState } from "react";
import {
  RotateCw,
  Combine,
  Scissors,
  FileMinus2,
  FileImage,
  Images,
  Download,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Button, Field, Input, Badge } from "@/components/ui";
import { Dropzone } from "@/components/Dropzone";
import {
  mergePdfs,
  splitPdf,
  deletePages,
  rotatePdf,
  imagesToPdf,
  pdfToImageDataUrls,
  downloadBytes,
  dataUrlToBlobDownload,
} from "@/lib/pdf";

type ToolId = "rotate" | "merge" | "split" | "delete" | "to-image" | "from-image";

const TOOLS: { id: ToolId; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "rotate", label: "문서 회전", icon: RotateCw, desc: "90/180/270° 회전" },
  { id: "merge", label: "PDF 병합", icon: Combine, desc: "여러 PDF를 하나로" },
  { id: "split", label: "PDF 분할", icon: Scissors, desc: "페이지·범위 분할" },
  { id: "delete", label: "페이지 삭제", icon: FileMinus2, desc: "특정 페이지 제거" },
  { id: "to-image", label: "PDF → 이미지", icon: FileImage, desc: "페이지를 PNG로" },
  { id: "from-image", label: "이미지 → PDF", icon: Images, desc: "이미지를 PDF로" },
];

export default function ToolsPage() {
  const [tool, setTool] = useState<ToolId>("merge");

  return (
    <div>
      <PageHeader title="PDF 도구모음" desc="거래내역서 등 PDF를 회전·병합·분할·변환합니다. 모든 처리는 브라우저에서 안전하게 수행됩니다." action={<Badge tone="muted">로컬 처리</Badge>} />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Card className="p-2">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              const active = tool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${active ? "bg-brand-50" : "hover:bg-surface-2"}`}
                >
                  <Icon size={18} className={active ? "text-brand" : "text-faint"} />
                  <div>
                    <div className={`text-[13.5px] font-medium ${active ? "text-brand-700" : "text-ink"}`}>{t.label}</div>
                    <div className="text-[11px] text-faint">{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </Card>
        </div>

        <div className="lg:col-span-3">
          {tool === "rotate" && <RotateTool />}
          {tool === "merge" && <MergeTool />}
          {tool === "split" && <SplitTool />}
          {tool === "delete" && <DeleteTool />}
          {tool === "to-image" && <ToImageTool />}
          {tool === "from-image" && <FromImageTool />}
        </div>
      </div>
    </div>
  );
}

function useBusy() {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      alert("처리 중 오류가 발생했습니다. 파일을 확인해주세요.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

function RunButton({ busy, onClick, children, disabled }: { busy: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <Button onClick={onClick} disabled={busy || disabled}>
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      {children}
    </Button>
  );
}

function RotateTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [deg, setDeg] = useState(90);
  const { busy, run } = useBusy();
  return (
    <Card>
      <CardHeader title="문서 회전" desc="회전된 거래내역서를 정방향으로 맞춥니다." />
      <div className="space-y-4 p-5">
        <Dropzone files={files} onFiles={setFiles} hint="PDF 1개" />
        <Field label="회전 각도">
          <div className="flex gap-2">
            {[90, 180, 270].map((d) => (
              <button key={d} onClick={() => setDeg(d)} className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${deg === d ? "border-brand bg-brand-50 text-brand-700" : "border-line text-muted"}`}>
                {d}°
              </button>
            ))}
          </div>
        </Field>
        <RunButton busy={busy} disabled={!files.length} onClick={() => run(async () => {
          const bytes = await rotatePdf(files[0], deg);
          downloadBytes(bytes, files[0].name.replace(/\.pdf$/i, "") + `_회전${deg}.pdf`);
        })}>회전 후 다운로드</RunButton>
      </div>
    </Card>
  );
}

function MergeTool() {
  const [files, setFiles] = useState<File[]>([]);
  const { busy, run } = useBusy();
  return (
    <Card>
      <CardHeader title="PDF 병합" desc="여러 거래내역서를 하나의 PDF로 합칩니다. (위에서부터 순서대로)" />
      <div className="space-y-4 p-5">
        <Dropzone files={files} onFiles={setFiles} multiple hint="PDF 여러 개" />
        <RunButton busy={busy} disabled={files.length < 2} onClick={() => run(async () => {
          const bytes = await mergePdfs(files);
          downloadBytes(bytes, "병합본.pdf");
        })}>{files.length}개 병합 후 다운로드</RunButton>
      </div>
    </Card>
  );
}

function SplitTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [ranges, setRanges] = useState("");
  const { busy, run } = useBusy();
  const parseRanges = (s: string): number[][] | undefined => {
    const r = s.split(",").map((x) => x.trim()).filter(Boolean).map((x) => {
      const m = x.match(/(\d+)\s*-\s*(\d+)/);
      if (m) return [Number(m[1]), Number(m[2])];
      const n = Number(x);
      return [n, n];
    });
    return r.length ? r : undefined;
  };
  return (
    <Card>
      <CardHeader title="PDF 분할" desc="페이지마다 또는 범위(예: 1-3, 4-6)로 나눕니다." />
      <div className="space-y-4 p-5">
        <Dropzone files={files} onFiles={setFiles} hint="PDF 1개" />
        <Field label="범위 (비우면 페이지마다 분할)" hint="예: 1-3, 4-6, 7">
          <Input value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 4-6" />
        </Field>
        <RunButton busy={busy} disabled={!files.length} onClick={() => run(async () => {
          const parts = await splitPdf(files[0], parseRanges(ranges));
          parts.forEach((p, i) => setTimeout(() => downloadBytes(p.bytes, p.name), i * 250));
        })}>분할 후 다운로드</RunButton>
        <p className="text-[11px] text-faint">분할 결과가 여러 개면 순차적으로 다운로드됩니다.</p>
      </div>
    </Card>
  );
}

function DeleteTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState("");
  const { busy, run } = useBusy();
  return (
    <Card>
      <CardHeader title="페이지 삭제" desc="표지·빈 페이지 등 불필요한 페이지를 제거합니다." />
      <div className="space-y-4 p-5">
        <Dropzone files={files} onFiles={setFiles} hint="PDF 1개" />
        <Field label="삭제할 페이지 번호" hint="예: 1, 3, 5">
          <Input value={pages} onChange={(e) => setPages(e.target.value)} placeholder="1, 3" />
        </Field>
        <RunButton busy={busy} disabled={!files.length || !pages.trim()} onClick={() => run(async () => {
          const nums = pages.split(",").map((x) => Number(x.trim())).filter((n) => n > 0);
          const bytes = await deletePages(files[0], nums);
          downloadBytes(bytes, files[0].name.replace(/\.pdf$/i, "") + "_정리.pdf");
        })}>삭제 후 다운로드</RunButton>
      </div>
    </Card>
  );
}

function ToImageTool() {
  const [files, setFiles] = useState<File[]>([]);
  const { busy, run } = useBusy();
  const [imgs, setImgs] = useState<string[]>([]);
  return (
    <Card>
      <CardHeader title="PDF → 이미지" desc="각 페이지를 PNG 이미지로 변환합니다." />
      <div className="space-y-4 p-5">
        <Dropzone files={files} onFiles={setFiles} hint="PDF 1개" />
        <RunButton busy={busy} disabled={!files.length} onClick={() => run(async () => {
          const urls = await pdfToImageDataUrls(files[0]);
          setImgs(urls);
        })}>이미지로 변환</RunButton>
        {imgs.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {imgs.map((u, i) => (
              <div key={i} className="overflow-hidden rounded-lg border border-line">
                <img src={u} alt={`page ${i + 1}`} className="w-full" />
                <button onClick={() => dataUrlToBlobDownload(u, `page_${i + 1}.png`)} className="flex w-full items-center justify-center gap-1 border-t border-line bg-surface py-2 text-[12px] font-medium text-brand hover:bg-brand-50">
                  <Download size={13} /> {i + 1}p 저장
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function FromImageTool() {
  const [files, setFiles] = useState<File[]>([]);
  const { busy, run } = useBusy();
  return (
    <Card>
      <CardHeader title="이미지 → PDF" desc="사진·스캔 이미지를 하나의 PDF로 만듭니다." />
      <div className="space-y-4 p-5">
        <Dropzone files={files} onFiles={setFiles} multiple accept="image/png,image/jpeg" hint="JPG/PNG 여러 개" />
        <RunButton busy={busy} disabled={!files.length} onClick={() => run(async () => {
          const bytes = await imagesToPdf(files);
          downloadBytes(bytes, "변환본.pdf");
        })}>PDF로 변환 후 다운로드</RunButton>
      </div>
    </Card>
  );
}
