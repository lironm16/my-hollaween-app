import { NextResponse } from "next/server";
import { parseSubscription } from "@/lib/push";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { savePushSubscription } from "@/lib/store";

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
    return NextResponse.json({ ok: true, count });
  } catch {
    return NextResponse.json({ error: "לא הצלחנו לשמור את ההתראות." }, { status: 500 });
  }
}
