import { NextResponse } from "next/server";
import { parseSubscription, readIncludeEndpoint } from "@/lib/push";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { countPushSubscriptions, isPushEndpointRegistered, savePushSubscription } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!rateLimit(`push-sub:${clientKey(request.headers)}`, 40, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "יותר מדי בקשות." }, { status: 429 });
  }
  const json = await request.json().catch(() => null);
  const parsed = parseSubscription(json);
  if (!parsed) {
    return NextResponse.json({ error: "הרשמת ההתראות אינה תקינה." }, { status: 400 });
  }
  try {
    const count = await savePushSubscription(parsed);
    const registered = await isPushEndpointRegistered(parsed.endpoint);
    return NextResponse.json({ ok: true, count, registered });
  } catch {
    return NextResponse.json(
      {
        error: "השרת לא הצליח לשמור ההרשמה. זה לא קשור להרשאת הדפדפן — נסו שוב בעוד רגע.",
        code: "SAVE_FAILED",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const endpoint = readIncludeEndpoint({
    includeEndpoint: new URL(request.url).searchParams.get("endpoint"),
  });
  const total = await countPushSubscriptions();
  if (!endpoint) {
    return NextResponse.json({ total });
  }
  const registered = await isPushEndpointRegistered(endpoint);
  return NextResponse.json({ total, registered });
}
