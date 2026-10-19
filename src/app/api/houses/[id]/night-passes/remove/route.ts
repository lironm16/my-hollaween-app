import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { canonicalHouseId } from "@/lib/ids";
import {
  ensureHouseAccess,
  houseAccessView,
  removeHouseAccessSession,
} from "@/lib/night-pass-service";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { mayManageHouseDevices } from "@/lib/night-pass-service";
import { getHouse } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const admin = await isAdmin();
  if (!admin && !(await readNightPassSettings()).enabled) {
    return NextResponse.json({ error: "קודי הכניסה עוד לא פעילים." }, { status: 404, headers: NO_STORE });
  }
  if (!(await mayManageHouseDevices(id, { admin }))) {
    return NextResponse.json(
      { error: "רק בעל בית יכול להסיר מכשירים." },
      { status: 403, headers: NO_STORE },
    );
  }
  const json = (await request.json().catch(() => null)) as { sessionId?: string } | null;
  const sessionId = typeof json?.sessionId === "string" ? json.sessionId.trim() : "";
  if (!sessionId) {
    return NextResponse.json({ error: "לא נמצא מכשיר להסרה." }, { status: 400, headers: NO_STORE });
  }
  const house = await getHouse(id);
  if (!house) return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404, headers: NO_STORE });
  const removed = await removeHouseAccessSession(house.id, sessionId);
  if (!removed) {
    return NextResponse.json({ error: "המכשיר כבר לא מחובר." }, { status: 404, headers: NO_STORE });
  }
  const record = await ensureHouseAccess(house.id);
  return NextResponse.json(
    {
      ok: true,
      access: houseAccessView(record, house.editCode, null, null),
    },
    { headers: NO_STORE },
  );
}
