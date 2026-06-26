// OCR 래퍼 (tesseract.js, 클라이언트 전용, 지연 로드)
// 스캔 PDF/이미지에서 한국어+영문 텍스트를 추출한다.

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function ocrImage(
  image: string | File | Blob,
  onProgress?: (p: number) => void,
): Promise<string> {
  const Tesseract = (await import("tesseract.js")).default as any;
  const { data } = await Tesseract.recognize(image, "kor+eng", {
    logger: (m: any) => {
      if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });
  return (data?.text ?? "").trim();
}

// 여러 이미지(스캔 PDF 페이지) OCR
export async function ocrImages(
  images: string[],
  onProgress?: (page: number, total: number, p: number) => void,
): Promise<string> {
  const out: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const text = await ocrImage(images[i], (p) => onProgress?.(i + 1, images.length, p));
    out.push(text);
  }
  return out.join("\n");
}
