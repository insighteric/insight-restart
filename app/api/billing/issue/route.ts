import { tossEnabled, issueBillingKey } from "@/lib/payments";

// 빌링키 발급: 토스 인증 성공 후 authKey + customerKey 를 받아 billingKey 발급
export async function POST(request: Request) {
  if (!tossEnabled()) {
    return Response.json({ error: "결제 연동이 설정되지 않았습니다(TOSS_SECRET_KEY)." }, { status: 503 });
  }
  const { authKey, customerKey } = (await request.json()) as { authKey?: string; customerKey?: string };
  if (!authKey || !customerKey) {
    return Response.json({ error: "authKey/customerKey 누락" }, { status: 400 });
  }
  try {
    const data = await issueBillingKey(authKey, customerKey);
    // 실제 서비스: data.billingKey 를 billing 테이블에 firm 단위로 저장
    return Response.json({
      ok: true,
      billingKey: data.billingKey,
      card: {
        company: data.card?.company,
        numberMasked: data.card?.number,
      },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
