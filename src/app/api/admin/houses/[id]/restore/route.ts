import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { adminRestoreHouse } from "@/lib/store";
import { canonicalHouseId } from "@/lib/ids";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const house = await adminRestoreHouse(id);
  if (!house) {
    return NextResponse.json({ error: "לא נמצא בית למחזור, או שהבית כבר פעיל." }, { status: 404 });
  }
  return NextResponse.json({ house });
}
