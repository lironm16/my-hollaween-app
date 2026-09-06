import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { applyTrafficDeltas, getHouseTraffic, type TrafficDelta } from "@/lib/traffic-store";
import type { TrafficKind } from "@/lib/traffic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set<TrafficKind>(["saved", "routed", "visited"]);

export async function GET() {
  const houses = await getHouseTraffic();
  return NextResponse.json(
    { houses },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=60",
      },
    },
  );
}

export async function POST(request: Request) {
  if (!rateLimit(`traffic:${clientKey(request.headers)}`, 40, 60 * 1000)) {
    return NextResponse.json({ error: "יותר מדי עדכונים." }, { status: 429 });
  }
  const json = (await request.json().catch(() => null)) as {
    events?: Array<{ houseId?: string; kind?: string; delta?: number }>;
  } | null;
  const events = Array.isArray(json?.events) ? json.events : [];
  const deltas: TrafficDelta[] = [];
  for (const event of events.slice(0, 40)) {
    if (!event?.houseId || !KINDS.has(event.kind as TrafficKind)) continue;
    const delta = event.delta === -1 ? -1 : 1;
    deltas.push({ houseId: event.houseId.slice(0, 40), kind: event.kind as TrafficKind, delta });
  }
  if (deltas.length === 0) {
    return NextResponse.json({ houses: await getHouseTraffic() });
  }
  const houses = await applyTrafficDeltas(deltas);
  return NextResponse.json({ ok: true, houses });
}
