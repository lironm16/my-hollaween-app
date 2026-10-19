import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { normalizeHouseAccessRole, sessionIsOwner } from "@/lib/house-access-role";
import { canonicalHouseId } from "@/lib/ids";
import {
  accessRecordLacksOwner,
  ensureHouseAccess,
  houseAccessView,
  mayManageHouseDevices,
} from "@/lib/night-pass-service";
import { currentNightPass, deviceSessionOnHouse, readNightPassCookie } from "@/lib/night-pass-session";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { ownerMayEdit } from "@/lib/owner-session";
import { getHouse } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Devices list — registered pass on this house, edit cookie, or admin. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const admin = await isAdmin();
  const mySession = admin ? null : await deviceSessionOnHouse(id);
  const hasEditAccess = admin || Boolean(mySession) || (await ownerMayEdit(id));
  if (!hasEditAccess) {
    return NextResponse.json({ error: "צריך לפתוח את הבית לעריכה." }, { status: 403, headers: NO_STORE });
  }
  const settings = await readNightPassSettings();
  if (!settings.enabled && !admin) {
    return NextResponse.json({ enabled: false, access: null }, { headers: NO_STORE });
  }
  const house = await getHouse(id);
  if (!house) return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404, headers: NO_STORE });
  const [record, devicePass, canManageDevices] = await Promise.all([
    ensureHouseAccess(house.id),
    currentNightPass(),
    mayManageHouseDevices(house.id, { admin }),
  ]);
  const noOwners = accessRecordLacksOwner(record);
  const cookie = await readNightPassCookie();
  const sameHouse =
    devicePass && devicePass.houseId === house.id && cookie?.passId === devicePass.id;
  const access = houseAccessView(
    record,
    house.editCode,
    sameHouse ? cookie?.sessionId : null,
    sameHouse ? cookie?.token : null,
  );
  const myRole = admin
    ? ("owner" as const)
    : mySession
      ? normalizeHouseAccessRole(mySession.role)
      : ("owner" as const);
  const registeredOnHouse = Boolean(mySession);
  const registeredOwner = registeredOnHouse && sessionIsOwner(mySession);
  const canPromoteOwner =
    admin || registeredOwner || (registeredOnHouse && noOwners) || (canManageDevices && noOwners);
  return NextResponse.json(
    {
      enabled: settings.enabled,
      access,
      thisDeviceRegistered: access.devices.some((d) => d.isThisDevice),
      myRole,
      permissions: {
        canPromoteOwner,
        canRemoveDevices: canManageDevices,
        canResetCode: canManageDevices && (registeredOwner || noOwners),
        canShareInvite: true,
      },
    },
    { headers: NO_STORE },
  );
}
