import { NextResponse } from "next/server";
import type { EventBoundaryKind } from "@/lib/event-boundary";
import { pickBoundaryAtPoint } from "@/lib/event-boundary-pick-at-point.server";

export const runtime = "nodejs";

const KINDS: EventBoundaryKind[] = ["city", "neighborhood", "street", "point"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const kindParam = (searchParams.get("kind") ?? "neighborhood") as EventBoundaryKind;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: "invalid_coords" }, { status: 400 });
  }
  if (lat < 29 || lat > 34 || lng < 34 || lng > 36) {
    return NextResponse.json({ ok: false, error: "out_of_israel" }, { status: 400 });
  }
  if (!KINDS.includes(kindParam)) {
    return NextResponse.json({ ok: false, error: "invalid_kind" }, { status: 400 });
  }

  try {
    const hit = await pickBoundaryAtPoint(lat, lng, kindParam);
    if (!hit) {
      return NextResponse.json({ ok: false, error: "no_match", kind: kindParam });
    }
    return NextResponse.json({ ok: true, hit });
  } catch {
    return NextResponse.json({ ok: false, error: "pick_failed" }, { status: 503 });
  }
}
