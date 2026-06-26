import { callClaude, extractJson, aiEnabled } from "@/lib/ai";
import { parseCorrectionRuleBased } from "@/lib/corrections";
import type { CorrectionItem } from "@/lib/types";

const SYSTEM = `당신은 대한민국 개인회생·개인파산 사건을 처리하는 베테랑 법무사무소 사무장입니다.
법원의 보정명령(보정권고) 원문을 받아, 항목별로 분해하여 의뢰인이 이해하기 쉽게 정리합니다.

규칙:
- 각 보정 항목을 독립된 객체로 분리합니다.
- category 는 다음 중 하나: income(소득), asset(재산), debt(채무·채권자목록), living(생계비), plan(변제계획·가용소득), liquidation(청산가치), service(송달), transfer(편파변제·재산처분), document(누락서류), etc(기타)
- summary: 법률용어를 풀어 일반인이 이해할 수 있는 한 문장.
- requiredDocs: 의뢰인이 준비/발급해야 할 서류 목록(발급처 포함하면 좋음).
- procedure: 의뢰인이 따라야 할 처리 절차를 1단계씩, 실행 가능한 동사형으로.
- clientNote: 의뢰인이 실수하지 않도록 하는 핵심 당부/주의 한 문장.
- 추측으로 사실을 만들지 말고, 보정명령에 적힌 범위 안에서 안내합니다.

반드시 아래 JSON 형식(배열)만 출력하세요. 다른 텍스트나 코드펜스 없이 JSON 만:
[
  {"category":"income","originalText":"해당 항목 원문","summary":"...","requiredDocs":["..."],"procedure":["..."],"clientNote":"..."}
]`;

let uid = 0;
const nid = () => `ci_${Date.now().toString(36)}_${uid++}`;

export async function POST(request: Request) {
  const { raw } = (await request.json()) as { raw?: string };
  if (!raw || raw.trim().length < 5) {
    return Response.json({ error: "보정명령 원문을 입력하세요." }, { status: 400 });
  }

  // AI 사용 가능하면 Claude 로 분석, 아니면 규칙기반 폴백
  if (aiEnabled()) {
    const text = await callClaude({
      system: SYSTEM,
      user: `다음 보정명령을 항목별로 분석해 JSON 배열로 정리해줘.\n\n---\n${raw}\n---`,
      maxTokens: 3000,
    });
    const parsed = extractJson<Omit<CorrectionItem, "id" | "done">[]>(text);
    if (parsed && Array.isArray(parsed) && parsed.length) {
      const items: CorrectionItem[] = parsed.map((p) => ({
        id: nid(),
        category: p.category ?? "etc",
        originalText: p.originalText ?? "",
        summary: p.summary,
        requiredDocs: p.requiredDocs ?? [],
        procedure: p.procedure ?? [],
        clientNote: p.clientNote,
        done: false,
      }));
      return Response.json({ items, source: "ai" });
    }
  }

  const items = parseCorrectionRuleBased(raw);
  return Response.json({ items, source: "rule" });
}
