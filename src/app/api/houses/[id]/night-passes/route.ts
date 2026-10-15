import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { canonicalHouseId } from "@/lib/ids";
import {
  ensureHouseAccess,
  houseAccessView,
  nightPassSlotView,
} from "@/lib/night-pass-service";
import { currentNightPass, readNightPassCookie } from "@/lib/night-pass-session";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { ownerMayEdit } from "@/lib/owner-session";
import { getHouse } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Family code + connected devices — owner (hw_owner cookie) or admin only. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const admin = await isAdmin();
  if (!admin && !(await ownerMayEdit(id))) {
    return NextResponse.json({ error: "צריך לפתוח את הבית לעריכה." }, { status: 403, headers: NO_STORE });
  }
  const settings = await readNightPassSettings();
  if (!settings.enabled && !admin) {
    return NextResponse.json({ enabled: false, access: null, slots: [] }, { headers: NO_STORE });
  }
  const house = await getHouse(id);
  if (!house) return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404, headers: NO_STORE });
  const [record, devicePass] = await Promise.all([
    ensureHouseAccess(house.id, house.editCode?.trim() || undefined),
    currentNightPass(),
  ]);
  const cookie = await readNightPassCookie();
  const token =
    devicePass && devicePass.houseId === house.id && cookie?.passId === devicePass.id
      ? cookie.token
      : null;
  const access = houseAccessView(record, token);
  const thisDeviceRegistered = access.devices.some((d) => d.isThisDevice);
  const slots = [nightPassSlotView(record, admin)];
  return NextResponse.json(
    {
      enabled: settings.enabled,
      access,
      slots,
      thisDeviceSlot: thisDeviceRegistered ? 1 : null,
      thisDeviceRegistered,
    },
    { headers: NO_STORE },
  );
}
