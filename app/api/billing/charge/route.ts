import { tossEnabled, chargeBilling, PLAN_PRICES } from "@/lib/payments";

// 정기결제 승인: billingKey 로 플랜 금액 결제
export async function POST(request: Request) {
  if (!tossEnabled()) {
    return Response.json({ error: "결제 연동이 설정되지 않았습니다(TOSS_SECRET_KEY)." }, { status: 503 });
  }
  const body = (await request.json()) as {
    billingKey?: string;
    customerKey?: string;
    plan?: string;
    customerEmail?: string;
  };
  const { billingKey, customerKey, plan = "pro", customerEmail } = body;
  if (!billingKey || !customerKey) {
    return Response.json({ error: "billingKey/customerKey 누락" }, { status: 400 });
  }
  const amount = PLAN_PRICES[plan] ?? PLAN_PRICES.pro;
  try {
    const data = await chargeBilling({
      billingKey,
      customerKey,
      amount,
      orderId: `hsn_${plan}_${Date.now()}`,
      orderName: `회생ON ${plan.toUpperCase()} 월 구독`,
      customerEmail,
    });
    return Response.json({ ok: true, status: data.status, approvedAt: data.approvedAt, amount });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
