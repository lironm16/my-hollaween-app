import { NextResponse } from "next/server";
import { houseSubmitSchema } from "@/lib/schema";
import { submitHouse } from "@/lib/store";
import { toEditorHouse } from "@/lib/ids";
import { geocodeHttpError } from "@/lib/geocode";
import { storageHttpError } from "@/lib/storage-errors";
import { registerBootstrapEditor } from "@/lib/house-access/service";
import { grantOwnerHouse } from "@/lib/owner-session";
import { readIncludeEndpoint } from "@/lib/push";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין." }, { status: 400 });
  }
  const parsed = houseSubmitSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[houses] validation failed", parsed.error.flatten());
    return NextResponse.json(
      { error: "בדקו את השדות ואת המיקום על המפה.", code: "VALIDATION" },
      { status: 400 },
    );
  }
  const { addedBy, ownerPhone, ...input } = parsed.data;
  try {
    const house = await submitHouse({ ...input, ownerPhone }, {
      includeEndpoint: readIncludeEndpoint(json),
      addedBy,
    });
    try {
      await grantOwnerHouse(house.house.id);
    } catch {
      /* owner cookie is optional — house is already saved */
    }
    try {
      await registerBootstrapEditor(house.house.id);
    } catch {
      /* access registration is best-effort */
    }
    return NextResponse.json({
      house: toEditorHouse(house.house),
      editCode: house.house.editCode,
      push: house.push,
    });
  } catch (error) {
    console.error("[houses] submit failed", error);
    const storage = storageHttpError(error);
    if (storage) {
      return NextResponse.json({ error: storage.error, code: storage.code }, { status: storage.status });
    }
    const geo = geocodeHttpError(error);
    if (geo) return NextResponse.json({ error: geo.error, code: geo.status === 400 ? "VALIDATION" : "GEOCODE" }, { status: geo.status });
    return NextResponse.json(
      { error: "לא הצלחנו לשמור את הבית. נסו שוב.", code: "UNKNOWN" },
      { status: 500 },
    );
  }
}
