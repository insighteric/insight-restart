import { sendNotification, notifyEnabled } from "@/lib/notify";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    to?: string;
    text?: string;
    channel?: "kakao" | "sms";
    variables?: Record<string, string>;
  };
  if (!body.to || !body.text) {
    return Response.json({ error: "to/text 누락" }, { status: 400 });
  }
  const result = await sendNotification({
    to: body.to,
    text: body.text,
    channel: body.channel,
    variables: body.variables,
  });
  return Response.json({ ...result, enabled: notifyEnabled() });
}
