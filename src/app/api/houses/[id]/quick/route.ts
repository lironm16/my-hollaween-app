import { NextResponse } from "next/server";
import { quickPatchSchema } from "@/lib/schema";
import { getHouse, quickUpdateByEditCode } from "@/lib/store";
import { canonicalHouseId, toPublicHouse } from "@/lib/ids";
import { geocodeHttpError } from "@/lib/geocode";
import { storageHttpError } from "@/lib/storage-errors";
import { grantOwnerHouse, ownerMayEdit } from "@/lib/owner-session";
import { isAdmin } from "@/lib/admin";
import { readIncludeEndpoint } from "@/lib/push";
import { clientKey } from "@/lib/rate-limit";
import { rateLimitShared } from "@/lib/rate-limit-store";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין." }, { status: 400 });
  }
  const parsed = quickPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים." }, { status: 400 });
  }
  const existing = await getHouse(id);
  if (!existing) {
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  const { editCode, ...patch } = parsed.data;
  const admin = await isAdmin();
  const ownerOk = await ownerMayEdit(id);
  const code = admin || ownerOk ? existing.editCode : (editCode?.trim() || "");
  if (!code || existing.editCode !== code) {
    const ip = clientKey(request.headers);
    if (!(await rateLimitShared(`edit-code:${ip}`, 40, 15 * 60 * 1000))) {
      return NextResponse.json({ error: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." }, { status: 429 });
    }
    if (!(await rateLimitShared(`edit-code:${ip}:${id}`, 12, 15 * 60 * 1000))) {
      return NextResponse.json({ error: "יותר מדי ניסיונות לבית הזה." }, { status: 429 });
    }
    return NextResponse.json({ error: "קוד העריכה שגוי." }, { status: 403 });
  }
  try {
    const result = await quickUpdateByEditCode(id, existing.editCode, patch, {
      includeEndpoint: readIncludeEndpoint(json),
    });
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error === "missing" ? "הבית לא נמצא." : "קוד העריכה שגוי." },
        { status: result.error === "missing" ? 404 : 403 },
      );
    }
    await grantOwnerHouse(id);
    return NextResponse.json({ house: toPublicHouse(result.house), push: result.push });
  } catch (error) {
    console.error("[houses] quick update failed", error);
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
