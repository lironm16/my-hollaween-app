import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { listAdminHouseAnomalies } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const payload = await listAdminHouseAnomalies();
  return NextResponse.json(payload, { headers: NO_STORE });
}
