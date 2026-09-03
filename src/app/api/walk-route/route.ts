import { NextResponse } from "next/server";
import { fetchWalkingGeometry } from "@/lib/osrm-walk";

export const runtime = "nodejs";

/** Proxy street geometry (car graph) so the line stays on roads, not park paths. */
export async function POST(request: Request) {
  const json = (await request.json().catch(() => null)) as
    | { points?: { lat: number; lng: number }[] }
    | null;
  const points = json?.points?.filter(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
  );
  if (!points || points.length < 2) {
    return NextResponse.json({ line: null }, { status: 400 });
  }
  const line = await fetchWalkingGeometry(points.slice(0, 80));
  return NextResponse.json({ line });
}
