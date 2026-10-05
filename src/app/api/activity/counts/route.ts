import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { readHouseEngagementCounts } from "@/lib/engagement-store";
import { canonicalHouseId } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const url = new URL(request.url);
  const raw = url.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((id) => canonicalHouseId(id.trim()))
    .filter(Boolean);
  if (!ids.length) {
    return NextResponse.json({ houses: {} }, { headers: NO_STORE });
  }
  const houses = await readHouseEngagementCounts(ids);
  return NextResponse.json(
    { houses },
    { headers: { ...NO_STORE, "Cache-Control": "private, max-age=15" } },
  );
}
