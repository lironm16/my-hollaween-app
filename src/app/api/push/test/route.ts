import { NextResponse } from "next/server";
import { readIncludeEndpoint } from "@/lib/push";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { sendPushTestToEndpoint } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!rateLimit(`push-test:${clientKey(request.headers)}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "יותר מדי בדיקות. המתינו כמה דקות." }, { status: 429 });
  }
  const json = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = readIncludeEndpoint(json);
  if (!endpoint) {
    return NextResponse.json({ error: "חסר מזהה מכשיר." }, { status: 400 });
  }
  try {
    const result = await sendPushTestToEndpoint(endpoint);
    if (!result.registered) {
      return NextResponse.json(
        {
          ok: false,
          registered: false,
          total: result.total,
          error: "המכשיר לא רשום בשרת. כבו והפעילו התראות שוב.",
        },
        { status: 404 },
      );
    }
    if (!result.delivered) {
      return NextResponse.json({
        ok: false,
        registered: true,
        delivered: false,
        total: result.total,
        error: "המכשיר רשום אבל השליחה נכשלה. נסו לכבות ולהפעיל התראות שוב.",
      });
    }
    return NextResponse.json({
      ok: true,
      registered: true,
      delivered: true,
      total: result.total,
    });
  } catch {
    return NextResponse.json({ error: "הבדיקה נכשלה." }, { status: 500 });
  }
}
