import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { applyTrafficDeltas, getHouseTraffic, type TrafficDelta } from "@/lib/traffic-store";
import { clampTrafficDelta, type TrafficKind } from "@/lib/traffic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set<TrafficKind>(["saved", "routed", "visited"]);

export async function GET() {
  const houses = await getHouseTraffic();
  return NextResponse.json(
    { houses },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  // Clients batch ~45s, so a handful of POSTs per IP per minute is enough.
  if (!rateLimit(`traffic:${clientKey(request.headers)}`, 8, 60 * 1000)) {
    return NextResponse.json({ error: "יותר מדי עדכונים." }, { status: 429 });
  }
  const json = (await request.json().catch(() => null)) as {
    events?: Array<{ houseId?: string; kind?: string; delta?: number }>;
  } | null;
  const events = Array.isArray(json?.events) ? json.events : [];
  const deltas: TrafficDelta[] = [];
  for (const event of events.slice(0, 80)) {
    if (!event?.houseId || !KINDS.has(event.kind as TrafficKind)) continue;
    const delta = clampTrafficDelta(event.delta ?? 1);
    if (!delta) continue;
    deltas.push({ houseId: event.houseId.slice(0, 40), kind: event.kind as TrafficKind, delta });
  }
  if (deltas.length === 0) {
    return NextResponse.json({ houses: await getHouseTraffic() });
  }
  const houses = await applyTrafficDeltas(deltas);
  return NextResponse.json({ ok: true, houses });
}
