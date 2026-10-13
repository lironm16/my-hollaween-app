import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { clampGemAnchorPlacement, gemAnchorPlacementError } from "@/lib/gem-anchor-placement";
import { houseMatchesGemHuntSet } from "@/lib/gem-school-campus";
import { canonicalHouseId, toEditorHouse } from "@/lib/ids";
import { grantOwnerHouse, ownerMayEdit } from "@/lib/owner-session";
import { clientKey } from "@/lib/rate-limit";
import { rateLimitShared } from "@/lib/rate-limit-store";
import { getAdminGemHuntPublicSettings, getHouse, setHouseGemAnchor } from "@/lib/store";
import { storageHttpError } from "@/lib/storage-errors";

export const runtime = "nodejs";

type Body = { lat?: unknown; lng?: unknown; editCode?: unknown };

async function readBody(request: Request): Promise<Body> {
  try {
    const text = await request.text();
    const json = text ? (JSON.parse(text) as unknown) : {};
    return json && typeof json === "object" ? (json as Body) : {};
  } catch {
    return {};
  }
}

async function authorize(request: Request, id: string, body: Body) {
  const existing = await getHouse(id);
  if (!existing) {
    return { error: NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 }) };
  }
  const admin = await isAdmin();
  if (!admin && !(await getAdminGemHuntPublicSettings()).enabled) {
    return { error: NextResponse.json({ error: "משחק השדונים כבוי." }, { status: 403 }) };
  }
  if (!houseMatchesGemHuntSet(existing, "all")) {
    return { error: NextResponse.json({ error: "אין שדון בבית הזה." }, { status: 400 }) };
  }
  if (admin || (await ownerMayEdit(id))) return { existing, admin };
  const code = typeof body.editCode === "string" ? body.editCode.trim() : "";
  if (code && code === existing.editCode) {
    await grantOwnerHouse(id);
    return { existing, admin };
  }
  const ip = clientKey(request.headers);
  if (!(await rateLimitShared(`edit-code:${ip}:${id}`, 12, 15 * 60 * 1000))) {
    return {
      error: NextResponse.json({ error: "יותר מדי ניסיונות לבית הזה." }, { status: 429 }),
    };
  }
  return { error: NextResponse.json({ error: "רק בעלי הבית יכולים להזיז את השדון." }, { status: 403 }) };
}

async function save(id: string, point: { lat: number; lng: number } | null) {
  try {
    const house = await setHouseGemAnchor(id, point);
    if (!house) return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
    return NextResponse.json({ house: toEditorHouse(house), gemAnchor: house.gemAnchor ?? null });
  } catch (error) {
    console.error("[gem-anchor] save failed", error);
    const storage = storageHttpError(error);
    if (storage) {
      return NextResponse.json({ error: storage.error, code: storage.code }, { status: storage.status });
    }
    return NextResponse.json({ error: "לא הצלחנו לשמור. נסו שוב." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const body = await readBody(request);
  const auth = await authorize(request, id, body);
  if ("error" in auth) return auth.error;
  const raw = { lat: Number(body.lat), lng: Number(body.lng) };
  const point = clampGemAnchorPlacement(auth.existing, raw);
  const invalid = gemAnchorPlacementError(auth.existing, point);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  return save(auth.existing.id, point);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const body = await readBody(request);
  const auth = await authorize(request, id, body);
  if ("error" in auth) return auth.error;
  return save(auth.existing.id, null);
}
