import { NextResponse } from "next/server";
import { applyActivityDelta, readActivityTotals } from "@/lib/activity-totals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const totals = await readActivityTotals();
  return NextResponse.json(totals, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { likedDelta?: unknown; visitedDelta?: unknown }
    | null;
  if (!body) {
    return NextResponse.json({ error: "גוף הבקשה לא תקין." }, { status: 400 });
  }
  try {
    const totals = await applyActivityDelta(body);
    return NextResponse.json({ ok: true, ...totals });
  } catch {
    return NextResponse.json({ error: "שמירת הפעילות נכשלה." }, { status: 503 });
  }
}
