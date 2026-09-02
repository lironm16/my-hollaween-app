import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getDbSnapshot } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const db = await getDbSnapshot();
  return NextResponse.json(
    { houses: db.houses, updatedAt: db.updatedAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
