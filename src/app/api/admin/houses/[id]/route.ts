import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { adminPatchSchema } from "@/lib/schema";
import { adminDeleteHouse, adminUpdate, getHouse } from "@/lib/store";
import { canonicalHouseId } from "@/lib/ids";
import { geocodeHttpError } from "@/lib/geocode";
import { storageHttpError } from "@/lib/storage-errors";
import { readIncludeEndpoint } from "@/lib/push";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const json = await request.json().catch(() => null);
  const parsed = adminPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים." }, { status: 400 });
  }
  try {
    const result = await adminUpdate(id, parsed.data, {
      includeEndpoint: readIncludeEndpoint(json),
    });
    if (!result) {
      return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
    }
    return NextResponse.json({ house: result.house, push: result.push });
  } catch (error) {
    console.error("[admin/houses] update failed", error);
    const storage = storageHttpError(error);
    if (storage) {
      return NextResponse.json({ error: storage.error, code: storage.code }, { status: storage.status });
    }
    const geo = geocodeHttpError(error);
    if (geo) return NextResponse.json({ error: geo.error }, { status: geo.status });
    return NextResponse.json(
      { error: "לא הצלחנו לשמור את הבית. נסו שוב." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const existing = await getHouse(id);
  if (!existing) {
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  const removed = await adminDeleteHouse(existing.id);
  if (!removed) {
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
