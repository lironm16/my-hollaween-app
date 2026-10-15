import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { canonicalHouseId } from "@/lib/ids";
import { houseAccessView, resetHouseAccess } from "@/lib/night-pass-service";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { ownerMayEdit } from "@/lib/owner-session";
import { getHouse, updateByEditCode } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** New family code — all devices must reconnect. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const admin = await isAdmin();
  if (!admin && !(await ownerMayEdit(id))) {
    return NextResponse.json({ error: "צריך לפתוח את הבית לעריכה." }, { status: 403, headers: NO_STORE });
  }
  if (!admin && !(await readNightPassSettings()).enabled) {
    return NextResponse.json({ error: "קודי הכניסה עוד לא פעילים." }, { status: 404, headers: NO_STORE });
  }
  const house = await getHouse(id);
  if (!house) return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404, headers: NO_STORE });
  const outcome = await resetHouseAccess(house.id);
  if (!outcome.ok) {
    return NextResponse.json({ error: "קוד המשפחה לא נמצא." }, { status: 404, headers: NO_STORE });
  }
  await updateByEditCode(house.id, house.editCode, { editCode: outcome.newCode });
  return NextResponse.json(
    { ok: true, access: houseAccessView(outcome.record, outcome.newCode, null) },
    { headers: NO_STORE },
  );
}
