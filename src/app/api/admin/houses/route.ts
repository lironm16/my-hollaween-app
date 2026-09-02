import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getAllHouses } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const houses = await getAllHouses();
  return NextResponse.json(
    { houses },
    { headers: { "Cache-Control": "no-store" } },
  );
}
