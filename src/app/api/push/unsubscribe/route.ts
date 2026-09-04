import { NextResponse } from "next/server";
import { removePushSubscription } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const json = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  const endpoint = json?.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: "חסר endpoint." }, { status: 400 });
  }
  try {
    await removePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "לא הצלחנו לבטל את ההתראות." }, { status: 500 });
  }
}
