import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { sanitizePushPayload, readIncludeEndpoint } from "@/lib/push";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { broadcastPush } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  if (!rateLimit(`admin-push:${clientKey(request.headers)}`, 12, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "יותר מדי שליחות. המתינו כמה דקות." }, { status: 429 });
  }
  const json = (await request.json().catch(() => null)) as {
    title?: string;
    body?: string;
    includeEndpoint?: string;
  } | null;
  const title = json?.title?.trim() ?? "";
  const body = json?.body?.trim() ?? "";
  if (!title || !body) {
    return NextResponse.json({ error: "צריך כותרת וטקסט." }, { status: 400 });
  }
  try {
    const payload = sanitizePushPayload({ title, body, url: "/", topic: "admin" });
    const result = await broadcastPush(payload, readIncludeEndpoint(json));
    return NextResponse.json({ ok: true, ...result, title: payload.title, body: payload.body });
  } catch {
    return NextResponse.json({ error: "השליחה נכשלה." }, { status: 500 });
  }
}
