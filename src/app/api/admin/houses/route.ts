import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { adminSubmitSchema } from "@/lib/schema";
import { getDbSnapshot, submitHouse } from "@/lib/store";
import { toEditorHouse } from "@/lib/ids";
import { geocodeHttpError } from "@/lib/geocode";
import { storageHttpError } from "@/lib/storage-errors";
import { readIncludeEndpoint } from "@/lib/push";

export const runtime = "nodejs";

/** Full house rows (incl. editCode + address) for manager UI — not redacted like public catalog. */
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

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין." }, { status: 400 });
  }
  const parsed = adminSubmitSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[admin/houses] validation failed", parsed.error.flatten());
    return NextResponse.json({ error: "נתונים לא תקינים." }, { status: 400 });
  }
  const { addedBy, ownerPhone, kind, poiCategory, ...input } = parsed.data;
  try {
    const result = await submitHouse(
      { ...input, ownerPhone, kind, poiCategory },
      {
        includeEndpoint: readIncludeEndpoint(json),
        addedBy,
        admin: true,
      },
    );
    return NextResponse.json({
      house: toEditorHouse(result.house, { includeAddedBy: true }),
      editCode: result.house.editCode,
      push: result.push,
    });
  } catch (error) {
    console.error("[admin/houses] submit failed", error);
    const storage = storageHttpError(error);
    if (storage) {
      return NextResponse.json({ error: storage.error, code: storage.code }, { status: storage.status });
    }
    const geo = geocodeHttpError(error);
    if (geo) {
      return NextResponse.json({ error: geo.error, code: geo.status === 400 ? "VALIDATION" : "GEOCODE" }, { status: geo.status });
    }
    return NextResponse.json({ error: "לא הצלחנו לשמור. נסו שוב." }, { status: 500 });
  }
}
