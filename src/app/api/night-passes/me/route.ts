import { NextResponse } from "next/server";
import { maskPhone } from "@/lib/house-access-code";
import { sessionIsOwner } from "@/lib/house-access-role";
import { houseAccessSessionForDevice } from "@/lib/night-pass-service";
import {
  describeNightPassLost,
  readAsUserParam,
  readNightPassCookie,
  resolveNightPassViewer,
  takeNightPassLost,
  type NightPassLost,
} from "@/lib/night-pass-session";
import { getHouse } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type NightPassMeResponse = {
  enabled: boolean;
  viewer: "legacy" | "public" | "owner" | "pass" | "admin";
  registered: boolean;
  holderName?: string;
  holderPhone?: string;
  houseName?: string;
  houseId?: string;
  /** hw_owner cookie houses — client may edit without a cached edit code. */
  ownedHouseIds?: string[];
  /** Role on the registered pass for this device, when registered. */
  accessRole?: "owner" | "editor";
  lost?: NightPassLost;
};

export async function GET(request: Request) {
  const staleCookie = await readNightPassCookie();
  const resolved = await resolveNightPassViewer({ asUser: readAsUserParam(request) });
  const pass = resolved.enabled ? resolved.pass : null;
  const cookie = pass ? await readNightPassCookie() : staleCookie;
  const session =
    pass && cookie
      ? houseAccessSessionForDevice(pass, cookie.sessionId, cookie.token)
      : null;
  const lostNow =
    !pass && staleCookie
      ? describeNightPassLost(staleCookie.passId, staleCookie.sessionId)
      : Promise.resolve(null);
  const [house, freshLost, storedLost] = await Promise.all([
    pass ? getHouse(pass.houseId).catch(() => null) : Promise.resolve(null),
    lostNow,
    pass ? Promise.resolve(null) : takeNightPassLost(),
  ]);
  const lost = freshLost ?? storedLost;
  const ownedHouseIds =
    resolved.scope && resolved.scope.ownedIds.size > 0
      ? [...resolved.scope.ownedIds]
      : undefined;
  const body: NightPassMeResponse = {
    enabled: resolved.enabled,
    viewer: resolved.viewer,
    registered: Boolean(pass && session),
    ...(session?.holderName ? { holderName: session.holderName } : {}),
    ...(session?.holderPhone ? { holderPhone: maskPhone(session.holderPhone) } : {}),
    ...(house?.name ? { houseName: house.name } : {}),
    ...(house?.id ? { houseId: house.id } : {}),
    ...(ownedHouseIds ? { ownedHouseIds } : {}),
    ...(session && pass
      ? { accessRole: sessionIsOwner(session) ? ("owner" as const) : ("editor" as const) }
      : {}),
    ...(lost ? { lost } : {}),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
