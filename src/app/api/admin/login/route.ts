import { NextResponse } from "next/server";
import { passwordMatches, setAdminCookie } from "@/lib/admin";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!rateLimit(`admin:${clientKey(request.headers)}`, 12, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "יותר מדי ניסיונות." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password || !passwordMatches(body.password)) {
    return NextResponse.json({ error: "סיסמה שגויה." }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
