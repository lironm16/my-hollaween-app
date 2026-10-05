import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { readHouseEngagementCounts, isCommunityEngagementEnabled } from "@/lib/engagement-store";
import { canonicalHouseId } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!(await isCommunityEngagementEnabled())) {
    return NextResponse.json({ enabled: false, houses: {} }, { headers: NO_STORE });
  }
  const url = new URL(request.url);
  const raw = url.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((id) => canonicalHouseId(id.trim()))
    .filter(Boolean);
  if (!ids.length) {
    return NextResponse.json({ enabled: true, houses: {} }, { headers: NO_STORE });
  }
  const admin = await isAdmin();
  const houses = await readHouseEngagementCounts(ids);
  return NextResponse.json(
    { enabled: true, admin, houses },
    {
      headers: {
        ...NO_STORE,
        "Cache-Control": admin ? "private, max-age=15" : "private, max-age=30",
      },
    },
  );
}
