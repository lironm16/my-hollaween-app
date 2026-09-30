import { NextResponse } from "next/server";
import { hasFullCatalogAccess, readAccessSession } from "@/lib/house-access/session";
import { hasAdminBypass } from "@/lib/admin";
import { fetchDisplayWalkingGeometry } from "@/lib/osrm-walk";

export const runtime = "nodejs";

/** Proxy walking geometry so phones don't hit CORS. Stays on streets around parks. */
export async function POST(request: Request) {
  if (!(await hasAdminBypass())) {
    const session = await readAccessSession();
    if (!hasFullCatalogAccess(session)) {
      return NextResponse.json({ error: "נדרשת גישה מלאה." }, { status: 403 });
    }
  }
  const json = (await request.json().catch(() => null)) as
    | { points?: { lat: number; lng: number }[] }
    | null;
  const points = json?.points?.filter(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
  );
  if (!points || points.length < 2) {
    return NextResponse.json({ line: null }, { status: 400 });
  }
  const line = await fetchDisplayWalkingGeometry(points.slice(0, 80));
  return NextResponse.json({ line: line ?? null });
}
