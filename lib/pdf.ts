// PDF 유틸리티 (클라이언트 전용)
// pdfjs-dist: 텍스트 추출/렌더, pdf-lib: 병합/분할/회전/삭제/이미지변환/하이라이트

/* eslint-disable @typescript-eslint/no-explicit-any */

let pdfjsPromise: Promise<any> | null = null;
async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

async function toArrayBuffer(input: File | ArrayBuffer): Promise<ArrayBuffer> {
  return input instanceof ArrayBuffer ? input : await input.arrayBuffer();
}

export interface TextItemPos {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// 한 줄(같은 y의 아이템들)을 컬럼 구조를 보존해 문자열로 합친다.
// 글자 사이 가로 간격이 폰트 크기 대비 충분히 크면 "컬럼 경계"로 보고 탭(\t)을 넣는다.
// → 표 형태 은행 PDF에서 날짜/적요/출금/입금/잔액 컬럼이 분리되어 파서 정밀도가 크게 향상된다.
function joinLineWithColumns(items: { x: number; w: number; h: number; s: string }[]): string {
  const sorted = items.filter((i) => i.s !== "").sort((a, b) => a.x - b.x);
  if (!sorted.length) return "";
  let line = sorted[0].s;
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = sorted[i - 1];
    const gap = cur.x - (prev.x + prev.w);
    const font = cur.h || prev.h || 10;
    // 폰트 크기의 약 0.9배를 넘는 빈칸 → 컬럼 경계
    if (gap > font * 0.9) line += "\t" + cur.s;
    else line += " " + cur.s;
  }
  // 셀 내부 다중 공백은 1칸으로, 탭 주변 공백은 제거
  return line.replace(/ {2,}/g, " ").replace(/ *\t */g, "\t").trim();
}

// 페이지별 텍스트(줄 단위 정렬, 컬럼 보존)
export async function extractTextByPage(input: File | ArrayBuffer): Promise<string[]> {
  const pdfjs = await getPdfjs();
  const buf = await toArrayBuffer(input);
  const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // y좌표로 줄 묶기 (너비·높이도 보존)
    const lines = new Map<number, { x: number; w: number; h: number; s: string }[]>();
    for (const it of content.items as any[]) {
      const tr = it.transform;
      const y = Math.round(tr[5]);
      const key = Math.round(y / 3) * 3;
      if (!lines.has(key)) lines.set(key, []);
      lines.get(key)!.push({ x: tr[4], w: it.width || 0, h: it.height || Math.abs(tr[3]) || 10, s: it.str });
    }
    const sortedLines = [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => joinLineWithColumns(items))
      .filter(Boolean);
    pages.push(sortedLines.join("\n"));
  }
  return pages;
}

export async function extractText(input: File | ArrayBuffer): Promise<string> {
  return (await extractTextByPage(input)).join("\n");
}

// 페이지를 PNG dataURL 로 렌더
export async function renderPageToDataUrl(
  input: File | ArrayBuffer,
  pageNum = 1,
  scale = 1.6,
): Promise<string> {
  const pdfjs = await getPdfjs();
  const buf = await toArrayBuffer(input);
  const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toDataURL("image/png");
}

export async function pdfPageCount(input: File | ArrayBuffer): Promise<number> {
  const pdfjs = await getPdfjs();
  const buf = await toArrayBuffer(input);
  const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
  return doc.numPages;
}

export async function pdfToImageDataUrls(
  input: File | ArrayBuffer,
  scale = 1.8,
  type: "image/png" | "image/jpeg" = "image/png",
  quality = 0.85,
): Promise<string[]> {
  const pdfjs = await getPdfjs();
  const buf = await toArrayBuffer(input);
  const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
  const urls: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    urls.push(canvas.toDataURL(type, quality));
  }
  return urls;
}

// ── pdf-lib 작업 ─────────────────────────────────────────────

export async function mergePdfs(files: (File | ArrayBuffer)[]): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();
  for (const f of files) {
    const buf = await toArrayBuffer(f);
    const src = await PDFDocument.load(buf);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((pg) => merged.addPage(pg));
  }
  return merged.save();
}

// 페이지 범위별로 분할. ranges 미지정 시 페이지마다 1개 파일.
export async function splitPdf(
  input: File | ArrayBuffer,
  ranges?: number[][],
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const { PDFDocument } = await import("pdf-lib");
  const buf = await toArrayBuffer(input);
  const src = await PDFDocument.load(buf);
  const total = src.getPageCount();
  const groups = ranges ?? Array.from({ length: total }, (_, i) => [i + 1, i + 1]);
  const out: { name: string; bytes: Uint8Array }[] = [];
  for (let g = 0; g < groups.length; g++) {
    const [from, to] = groups[g];
    const doc = await PDFDocument.create();
    const idxs: number[] = [];
    for (let i = from; i <= to; i++) if (i >= 1 && i <= total) idxs.push(i - 1);
    const pages = await doc.copyPages(src, idxs);
    pages.forEach((p) => doc.addPage(p));
    out.push({ name: `split_${from}-${to}.pdf`, bytes: await doc.save() });
  }
  return out;
}

export async function deletePages(input: File | ArrayBuffer, pagesToDelete: number[]): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const buf = await toArrayBuffer(input);
  const doc = await PDFDocument.load(buf);
  const del = new Set(pagesToDelete);
  // 뒤에서부터 제거
  for (let i = doc.getPageCount(); i >= 1; i--) if (del.has(i)) doc.removePage(i - 1);
  return doc.save();
}

export async function rotatePdf(
  input: File | ArrayBuffer,
  deg: number,
  pages?: number[],
): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await import("pdf-lib");
  const buf = await toArrayBuffer(input);
  const doc = await PDFDocument.load(buf);
  const target = pages ? new Set(pages) : null;
  doc.getPages().forEach((pg, i) => {
    if (target && !target.has(i + 1)) return;
    const cur = pg.getRotation().angle;
    pg.setRotation(degrees((cur + deg) % 360));
  });
  return doc.save();
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  for (const f of files) {
    const buf = await f.arrayBuffer();
    const isPng = /png$/i.test(f.type) || /\.png$/i.test(f.name);
    const img = isPng ? await doc.embedPng(buf) : await doc.embedJpg(buf);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return doc.save();
}

// 텍스트 매칭 라인 하이라이트(텍스트 PDF). predicate(lineText) → true면 색칠.
export async function highlightPdf(
  input: File | ArrayBuffer,
  predicate: (lineText: string) => "out" | "in" | "mark" | null,
  mode: "split" | "unified" = "split",
): Promise<Uint8Array> {
  const pdfjs = await getPdfjs();
  const { PDFDocument, rgb } = await import("pdf-lib");
  const buf = await toArrayBuffer(input);
  const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
  const out = await PDFDocument.load(buf);

  const colors = {
    out: rgb(1, 0.85, 0.85),
    in: rgb(0.84, 0.9, 1),
    mark: rgb(1, 0.96, 0.6),
  };

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const outPage = out.getPage(p - 1);
    const lines = new Map<number, { x: number; w: number; s: string; h: number }[]>();
    for (const it of content.items as any[]) {
      const tr = it.transform;
      const y = Math.round(tr[5] / 3) * 3;
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push({ x: tr[4], w: it.width, s: it.str, h: it.height || 10 });
    }
    for (const [y, items] of lines) {
      const text = items.sort((a, b) => a.x - b.x).map((i) => i.s).join(" ");
      const kind = predicate(text);
      if (!kind) continue;
      const minX = Math.min(...items.map((i) => i.x));
      const maxX = Math.max(...items.map((i) => i.x + i.w));
      const h = Math.max(...items.map((i) => i.h), 10);
      const color = mode === "unified" ? colors.mark : colors[kind];
      outPage.drawRectangle({
        x: minX - 2,
        y: y - 2,
        width: maxX - minX + 4,
        height: h + 4,
        color,
        opacity: 0.45,
      });
    }
  }
  return out.save();
}

// ── 다운로드 ─────────────────────────────────────────────

export function downloadBytes(bytes: Uint8Array | string, name: string, mime = "application/pdf") {
  const blob =
    typeof bytes === "string"
      ? new Blob([bytes], { type: mime })
      : new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function dataUrlToBlobDownload(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}
