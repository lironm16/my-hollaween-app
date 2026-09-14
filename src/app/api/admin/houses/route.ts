import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getAdminHouses } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const { houses, updatedAt } = await getAdminHouses();
  return NextResponse.json(
    { houses, updatedAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
