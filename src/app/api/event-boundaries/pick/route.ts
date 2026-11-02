import { NextResponse } from "next/server";
import { pickGovNeighborhoodAtPoint } from "@/lib/gov-neighborhoods/pick-at-point.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: "invalid_coords" }, { status: 400 });
  }
  if (lat < 29 || lat > 34 || lng < 34 || lng > 36) {
    return NextResponse.json({ ok: false, error: "out_of_israel" }, { status: 400 });
  }

  const hit = pickGovNeighborhoodAtPoint(lat, lng);
  if (!hit) {
    return NextResponse.json({ ok: false, error: "no_neighborhood" });
  }

  return NextResponse.json({ ok: true, hit });
}
