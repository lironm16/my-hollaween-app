import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { countPresence, touchPresence } from "@/lib/presence-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!rateLimit(`presence:${clientKey(request.headers)}`, 6, 60 * 1000)) {
    return NextResponse.json({ error: "יותר מדי עדכונים." }, { status: 429 });
  }
  const json = (await request.json().catch(() => null)) as { id?: string } | null;
  const id = typeof json?.id === "string" ? json.id : "";
  const online = touchPresence(id);
  return NextResponse.json(
    { ok: true, online },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  return NextResponse.json(
    { online: countPresence() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
