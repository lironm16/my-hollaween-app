import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { normalizeHouseAccessRole, sessionIsOwner } from "@/lib/house-access-role";
import { canonicalHouseId } from "@/lib/ids";
import { ensureHouseAccess, houseAccessView } from "@/lib/night-pass-service";
import { currentNightPass, deviceSessionOnHouse, readNightPassCookie } from "@/lib/night-pass-session";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { getHouse } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Family code + connected devices — registered device on this house (editor or owner) or admin. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const admin = await isAdmin();
  const mySession = admin ? null : await deviceSessionOnHouse(id);
  if (!admin && !mySession) {
    return NextResponse.json(
      { error: "צריך מכשיר רשום לבית הזה כדי לראות את הרשימה." },
      { status: 403, headers: NO_STORE },
    );
  }
  const settings = await readNightPassSettings();
  if (!settings.enabled && !admin) {
    return NextResponse.json({ enabled: false, access: null }, { headers: NO_STORE });
  }
  const house = await getHouse(id);
  if (!house) return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404, headers: NO_STORE });
  const [record, devicePass] = await Promise.all([
    ensureHouseAccess(house.id),
    currentNightPass(),
  ]);
  const cookie = await readNightPassCookie();
  const sameHouse =
    devicePass && devicePass.houseId === house.id && cookie?.passId === devicePass.id;
  const access = houseAccessView(
    record,
    house.editCode,
    sameHouse ? cookie?.sessionId : null,
    sameHouse ? cookie?.token : null,
  );
  const myRole = admin ? ("owner" as const) : normalizeHouseAccessRole(mySession?.role);
  const isOwner = admin || sessionIsOwner(mySession);
  return NextResponse.json(
    {
      enabled: settings.enabled,
      access,
      thisDeviceRegistered: access.devices.some((d) => d.isThisDevice),
      myRole,
      permissions: {
        canPromoteOwner: isOwner,
        canRemoveDevices: isOwner,
        canResetCode: isOwner,
        canShareInvite: isOwner || myRole === "editor",
      },
    },
    { headers: NO_STORE },
  );
}
