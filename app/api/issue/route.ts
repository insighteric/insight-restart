import { issueDocument, isCodefDoc } from "@/lib/codef";

export const runtime = "nodejs";

// 공공·행정 서류 자동발급(CODEF). 키 미설정 시 목업으로 동작.
export async function POST(request: Request) {
  let body: { docKey?: string; clientName?: string };
  try {
    body = (await request.json()) as { docKey?: string; clientName?: string };
  } catch {
    return Response.json({ ok: false, message: "잘못된 요청" }, { status: 400 });
  }
  const docKey = body.docKey ?? "";
  if (!docKey || !isCodefDoc(docKey)) {
    return Response.json({ ok: false, message: "자동발급 미지원 서류입니다." }, { status: 400 });
  }
  const result = await issueDocument({ docKey, clientName: body.clientName });
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
