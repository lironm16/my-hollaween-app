import { NextResponse } from "next/server";
import { fetchWalkingGeometry, fetchWalkingLegDistances } from "@/lib/osrm-walk";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Proxy walking geometry so phones don't hit CORS. Stays on streets around parks. */
export async function POST(request: Request) {
  const json = (await request.json().catch(() => null)) as
    | { points?: { lat: number; lng: number }[] }
    | null;
  const points = json?.points?.filter(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
  );
  if (!points || points.length < 2) {
    return NextResponse.json({ line: null, legMeters: null }, { status: 400 });
  }
  const waypoints = points.slice(0, 80);
  const [legMeters, line] = await Promise.all([
    fetchWalkingLegDistances(waypoints),
    fetchWalkingGeometry(waypoints),
  ]);
  return NextResponse.json({ line: line ?? null, legMeters: legMeters ?? null });
}
