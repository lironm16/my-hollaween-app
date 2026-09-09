import { NextResponse } from "next/server";
import { adminLoginEnabled, passwordMatches, setAdminCookie } from "@/lib/admin";
import { clientKey } from "@/lib/rate-limit";
import { rateLimitShared } from "@/lib/rate-limit-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!adminLoginEnabled()) {
    return NextResponse.json({ error: "כניסת מנהל לא מוגדרת בשרת." }, { status: 503 });
  }
  if (!(await rateLimitShared(`admin:${clientKey(request.headers)}`, 12, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "יותר מדי ניסיונות." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password || !passwordMatches(body.password)) {
    return NextResponse.json({ error: "סיסמה שגויה." }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
