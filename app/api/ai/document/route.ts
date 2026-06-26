import { callClaude, aiEnabled } from "@/lib/ai";
import { generateDocDraft } from "@/lib/docgen";
import { docTypeLabel } from "@/lib/format";
import type { Case, Client, DocType } from "@/lib/types";

export async function POST(request: Request) {
  const { type, caseData, client } = (await request.json()) as {
    type: DocType;
    caseData: Case;
    client: Client;
  };

  const baseDraft = generateDocDraft(type, caseData, client);

  if (aiEnabled()) {
    const text = await callClaude({
      system: `당신은 대한민국 개인회생·파산 서류를 작성하는 법무사무소 전문가입니다.
주어진 사건 데이터와 초안을 바탕으로 ${docTypeLabel[type]}를 법원 제출 수준으로 자연스럽고 정확하게 완성하세요.
사실관계를 임의로 지어내지 말고, 비어 있는 항목은 밑줄(____)로 남겨 담당자가 채우도록 하세요. 문서 본문만 출력하세요.`,
      user: `[사건 데이터]\n${JSON.stringify({ caseData, client }, null, 2)}\n\n[초안]\n${baseDraft}`,
      maxTokens: 2500,
    });
    if (text) return Response.json({ draft: text, source: "ai" });
  }

  return Response.json({ draft: baseDraft, source: "rule" });
}
