import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { HOUSE_SETS, type HouseSet } from "@/lib/house-set";
import { listAdminHouseAnomalies } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const raw = new URL(request.url).searchParams.get("houseSet");
  const houseSet: HouseSet = HOUSE_SETS.includes(raw as HouseSet) ? (raw as HouseSet) : "real";
  const payload = await listAdminHouseAnomalies(houseSet);
  return NextResponse.json({ ...payload, houseSet }, { headers: NO_STORE });
}
