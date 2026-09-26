import { NextResponse } from "next/server";
import { osrmNearestFootWalk } from "@/lib/gem-osrm-snap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Snap one house pin to the nearest OSM foot path (fast — used in batches from the client). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }
  const snap = await osrmNearestFootWalk({ lat, lng });
  if (!snap) {
    return NextResponse.json({ error: "no snap" }, { status: 404 });
  }
  return NextResponse.json(snap, {
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
  });
}
