import { callClaudeVision, aiEnabled } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const BANK_HINT = `각 거래를 다음 5개 열의 CSV 데이터 행으로만 출력하세요(헤더·설명·코드펜스 금지):
날짜,거래상대방,적요,출금,입금
- 날짜: YYYY-MM-DD (연도가 안 보이면 명세서 상단 조회기간/발급일 기준으로 보정)
- 거래상대방: 입금자/수취인/상대 예금주 (없으면 비움)
- 적요: 거래내용/거래구분
- 출금: 출금(인출)액 숫자만, 입금 거래면 비움
- 입금: 입금액 숫자만, 출금 거래면 비움
- 금액은 콤마·원화기호 없이 숫자만. 텍스트 안의 콤마는 공백으로 바꾸세요.
- 표의 모든 거래 행을 빠짐없이, 위에서 아래(또는 명세서 순서)대로 출력하세요. 합계·잔액증명 문구는 제외.`;

const CARD_HINT = `각 이용내역을 다음 4개 열의 CSV 데이터 행으로만 출력하세요(헤더·설명·코드펜스 금지):
승인일,가맹점명,이용내역,이용금액
- 승인일: YYYY-MM-DD
- 가맹점명: 가맹점/상호
- 이용내역: 할부/일시불/구분 등(없으면 비움)
- 이용금액: 숫자만(콤마·기호 없이). 취소·환불이면 음수로.
- 텍스트 안의 콤마는 공백으로. 합계 행은 제외.`;

const SYSTEM = `당신은 대한민국 은행/카드 거래내역서(스캔본 이미지)를 정확히 판독해 표를 그대로 디지털화하는 OCR 전문가입니다.
이미지에 보이는 거래 표를 한 줄도 빠뜨리거나 지어내지 말고 그대로 추출합니다. 숫자(금액)는 특히 정확히 읽으세요.
오직 CSV 데이터 행만 출력하고, 다른 말·헤더·코드펜스는 절대 출력하지 않습니다.`;

export async function POST(request: Request) {
  if (!aiEnabled()) {
    return Response.json({ error: "AI 미설정(ANTHROPIC_API_KEY 필요)" }, { status: 400 });
  }
  let body: { images?: string[]; source?: string };
  try {
    body = (await request.json()) as { images?: string[]; source?: string };
  } catch {
    return Response.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const images = (body.images ?? []).filter((s) => typeof s === "string" && s.length > 0).slice(0, 6);
  if (!images.length) return Response.json({ error: "이미지가 없습니다." }, { status: 400 });

  const isCard = body.source === "card";
  const text = await callClaudeVision({
    system: SYSTEM,
    user: `다음 ${isCard ? "카드 이용내역서" : "은행 거래내역서"} 스캔 이미지에서 모든 거래를 추출하세요.\n\n${isCard ? CARD_HINT : BANK_HINT}`,
    images,
    maxTokens: 8000,
  });
  if (!text) return Response.json({ error: "AI 추출에 실패했습니다." }, { status: 502 });

  const rows = text
    .replace(/^```\w*$/gm, "")
    .replace(/```/g, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && /\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/.test(l))
    .join("\n");

  return Response.json({ rows, source: "ai-vision" });
}
