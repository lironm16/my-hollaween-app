import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { buildAdminSnapshot } from "@/lib/admin-snapshot";
import { getDbSnapshot } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const db = await getDbSnapshot();
  return NextResponse.json(
    buildAdminSnapshot({ houses: db.houses }),
    { headers: { "Cache-Control": "no-store" } },
  );
}
