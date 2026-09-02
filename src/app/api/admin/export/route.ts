import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { asCatalog, getAllHouses } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const houses = await getAllHouses();
  const catalog = asCatalog(houses, new Date().toISOString());
  return NextResponse.json(catalog,
    {
      headers: {
        "Content-Disposition": "attachment; filename=catalog.json",
        "Cache-Control": "no-store",
      },
    },
  );
}
