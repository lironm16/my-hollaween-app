import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getAdminStubHouses } from "@/lib/store";

export const runtime = "nodejs";

/** Rehearsal stubs — not included in the public /api/catalog payload. */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const { houses, updatedAt } = await getAdminStubHouses();
  return NextResponse.json(
    { houses, updatedAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
