import { NextResponse } from "next/server";
import { ownerPatchSchema } from "@/lib/schema";
import { deleteByEditCode, getCatalog, getHouse, updateByEditCode } from "@/lib/store";
import { toPublicHouse } from "@/lib/ids";
import { config } from "@/lib/config";
import { geocodeHttpError } from "@/lib/geocode";
import { grantOwnerHouse, ownerMayEdit } from "@/lib/owner-session";
import { isAdmin } from "@/lib/admin";
import { readIncludeEndpoint } from "@/lib/push";

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
        { error: "הבית לא מוצג במפה הציבורית עכשיו." },
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
  const existing = await getHouse(id);
  if (!existing) {
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  const { editCode, ...patch } = parsed.data;
  const admin = await isAdmin();
  const ownerOk = await ownerMayEdit(id);
  const code = admin || ownerOk ? existing.editCode : (editCode?.trim() || "");
  if (!code || existing.editCode !== code) {
    return NextResponse.json({ error: "קוד העריכה שגוי." }, { status: 403 });
  }
  try {
    const result = await updateByEditCode(id, existing.editCode, patch, {
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
    const geo = geocodeHttpError(error);
    if (geo) return NextResponse.json({ error: geo.error }, { status: geo.status });
    return NextResponse.json(
      { error: "לא הצלחנו לשמור את הבית. נסו שוב." },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
  const existing = await getHouse(id);
  if (!existing) {
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  const editCode =
    json && typeof json === "object" && "editCode" in json && typeof json.editCode === "string"
      ? json.editCode.trim()
      : "";
  const admin = await isAdmin();
  const ownerOk = await ownerMayEdit(id);
  const code = admin || ownerOk ? existing.editCode : editCode;
  if (code.length < 4 || code.length > 12 || existing.editCode !== code) {
    return NextResponse.json({ error: "קוד העריכה שגוי." }, { status: 403 });
  }
  const removed = await deleteByEditCode(id, existing.editCode);
  if (!removed) {
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
