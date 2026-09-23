import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { adminSubmitSchema } from "@/lib/schema";
import { submitHouse } from "@/lib/store";
import { toPublicHouse } from "@/lib/ids";
import { geocodeHttpError } from "@/lib/geocode";
import { storageHttpError } from "@/lib/storage-errors";
import { readIncludeEndpoint } from "@/lib/push";

export const runtime = "nodejs";

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
  const { addedBy, kind, poiCategory, ...input } = parsed.data;
  try {
    const result = await submitHouse(
      { ...input, kind, poiCategory },
      {
        includeEndpoint: readIncludeEndpoint(json),
        addedBy,
        admin: true,
      },
    );
    return NextResponse.json({
      house: toPublicHouse(result.house),
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
