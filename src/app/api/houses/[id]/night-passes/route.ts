import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { canonicalHouseId } from "@/lib/ids";
import { ensureHouseNightPasses, nightPassSlotView } from "@/lib/night-pass-service";
import { currentNightPass } from "@/lib/night-pass-session";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { ownerMayEdit } from "@/lib/owner-session";
import { getHouse } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** The house's four night-pass codes — owner (hw_owner cookie) or admin only. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const admin = await isAdmin();
  if (!admin && !(await ownerMayEdit(id))) {
    return NextResponse.json({ error: "צריך לפתוח את הבית לעריכה." }, { status: 403, headers: NO_STORE });
  }
  const settings = await readNightPassSettings();
  if (!settings.enabled && !admin) {
    return NextResponse.json({ enabled: false, slots: [] }, { headers: NO_STORE });
  }
  const house = await getHouse(id);
  if (!house) return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404, headers: NO_STORE });
  const [rows, devicePass] = await Promise.all([ensureHouseNightPasses(house.id), currentNightPass()]);
  return NextResponse.json(
    {
      enabled: settings.enabled,
      slots: rows.map((row) => nightPassSlotView(row, admin)),
      thisDeviceSlot: devicePass?.houseId === house.id ? devicePass.slot : null,
      thisDeviceRegistered: Boolean(devicePass),
    },
    { headers: NO_STORE },
  );
}
