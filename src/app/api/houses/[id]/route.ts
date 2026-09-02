import { NextResponse } from "next/server";
import { ownerPatchSchema } from "@/lib/schema";
import { getCatalog, getHouse, updateByEditCode } from "@/lib/store";
import { toPublicHouse } from "@/lib/ids";
import { config } from "@/lib/config";
import { geocodeHttpError } from "@/lib/geocode";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const catalog = await getCatalog();
  const house = catalog.houses.find((h) => h.id === id);
  if (!house) {
    const hidden = await getHouse(id);
    if (hidden) {
      return NextResponse.json(
        { error: "הבית ממתין לאישור ואינו מוצג במפה עדיין." },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  return NextResponse.json(house, {
    headers: {
      "Cache-Control":
        config.catalogCacheSeconds > 0
          ? `public, max-age=0, s-maxage=${config.catalogCacheSeconds}`
          : "no-store",
    },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין." }, { status: 400 });
  }
  const parsed = ownerPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים." }, { status: 400 });
  }
  const { editCode, ...patch } = parsed.data;
  try {
    const house = await updateByEditCode(id, editCode, patch);
    if (!house) {
      return NextResponse.json(
        { error: "קוד העריכה שגוי או שהבית לא נמצא." },
        { status: 403 },
      );
    }
    return NextResponse.json({ house: toPublicHouse(house) });
  } catch (error) {
    const geo = geocodeHttpError(error);
    if (geo) return NextResponse.json({ error: geo.error }, { status: geo.status });
    throw error;
  }
}
