// Anthropic API 래퍼 (서버 전용)
// ANTHROPIC_API_KEY 가 설정되어 있으면 Claude 를 호출하고,
// 없으면 null 을 반환하여 호출부에서 규칙기반 폴백을 사용한다.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function callClaude(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: opts.maxTokens ?? 2000,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
      }),
    });
    if (!res.ok) {
      console.error("Anthropic error", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const text = (data?.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n");
    return text || null;
  } catch (e) {
    console.error("Anthropic call failed", e);
    return null;
  }
}

// 이미지(스캔 명세서 페이지) + 지시문으로 Claude 비전 호출
export async function callClaudeVision(opts: {
  system: string;
  user: string;
  images: string[]; // data URL 또는 base64
  maxTokens?: number;
}): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const content: unknown[] = [];
  for (const img of opts.images) {
    const m = img.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
    content.push({
      type: "image",
      source: { type: "base64", media_type: m ? m[1] : "image/jpeg", data: m ? m[2] : img },
    });
  }
  content.push({ type: "text", text: opts.user });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: opts.maxTokens ?? 4000,
        system: opts.system,
        messages: [{ role: "user", content }],
      }),
    });
    if (!res.ok) {
      console.error("Anthropic vision error", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const text = (data?.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n");
    return text || null;
  } catch (e) {
    console.error("Anthropic vision call failed", e);
    return null;
  }
}

// JSON 응답을 안전하게 파싱 (코드펜스 제거)
export function extractJson<T>(text: string | null): T | null {
  if (!text) return null;
  const cleaned = text
    .replace(/^```(?:json)?/gm, "")
    .replace(/```$/gm, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const m = cleaned.match(/[{[][\s\S]*[}\]]/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
