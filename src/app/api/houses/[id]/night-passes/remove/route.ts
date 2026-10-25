import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { canonicalHouseId } from "@/lib/ids";
import {
  callerMayRemoveHouseAccessSession,
  ensureHouseAccess,
  houseAccessView,
  reconcileHouseAccessOwners,
  removeHouseAccessSession,
} from "@/lib/night-pass-service";
import { readNightPassSettings } from "@/lib/night-pass-store";
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
  const json = (await request.json().catch(() => null)) as { sessionId?: string } | null;
  const sessionId = typeof json?.sessionId === "string" ? json.sessionId.trim() : "";
  if (!sessionId) {
    return NextResponse.json({ error: "לא נמצא מכשיר להסרה." }, { status: 400, headers: NO_STORE });
  }
  const house = await getHouse(id);
  if (!house) return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404, headers: NO_STORE });
  const removeAllowed = await callerMayRemoveHouseAccessSession(house.id, sessionId, { admin });
  if (!removeAllowed.ok) {
    const error =
      removeAllowed.error === "missing"
        ? "המכשיר כבר לא מחובר."
        : "עורך יכול להסיר רק מכשירי עורך.";
    const status = removeAllowed.error === "missing" ? 404 : 403;
    return NextResponse.json({ error }, { status, headers: NO_STORE });
  }
  const removed = await removeHouseAccessSession(house.id, sessionId);
  if (!removed) {
    return NextResponse.json({ error: "המכשיר כבר לא מחובר." }, { status: 404, headers: NO_STORE });
  }
  await reconcileHouseAccessOwners(house.id);
  const record = await ensureHouseAccess(house.id);
  return NextResponse.json(
    {
      ok: true,
      access: houseAccessView(record, house.editCode, null, null),
    },
    { headers: NO_STORE },
  );
}
