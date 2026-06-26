// 토스페이먼츠 정기결제(빌링) 서버 헬퍼
// TOSS_SECRET_KEY(서버), NEXT_PUBLIC_TOSS_CLIENT_KEY(클라이언트) 필요.
// 테스트 키로도 동작(test_ck_..., test_sk_...). 미설정 시 enabled=false.

const TOSS_API = "https://api.tosspayments.com/v1";

export function tossEnabled(): boolean {
  return !!process.env.TOSS_SECRET_KEY;
}

function authHeader(): string {
  const key = process.env.TOSS_SECRET_KEY || "";
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

// authKey → billingKey 발급 (빌링키 등록)
export async function issueBillingKey(authKey: string, customerKey: string) {
  const res = await fetch(`${TOSS_API}/billing/authorizations/${authKey}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ customerKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "빌링키 발급 실패");
  return data; // { billingKey, card: { company, number, ... }, ... }
}

// 정기결제 승인 (빌링키로 결제)
export async function chargeBilling(opts: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string;
}) {
  const res = await fetch(`${TOSS_API}/billing/${opts.billingKey}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      customerKey: opts.customerKey,
      amount: opts.amount,
      orderId: opts.orderId,
      orderName: opts.orderName,
      customerEmail: opts.customerEmail,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "결제 승인 실패");
  return data;
}

export const PLAN_PRICES: Record<string, number> = {
  pro: 59000,
  team: 149000,
};
