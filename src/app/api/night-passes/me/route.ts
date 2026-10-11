import { NextResponse } from "next/server";
import { maskPhone } from "@/lib/night-pass-codes";
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
  lost?: NightPassLost;
};

export async function GET(request: Request) {
  const staleCookie = await readNightPassCookie();
  const resolved = await resolveNightPassViewer({ asUser: readAsUserParam(request) });
  const pass = resolved.enabled ? resolved.pass : null;
  const lostNow =
    !pass && staleCookie ? describeNightPassLost(staleCookie.passId) : Promise.resolve(null);
  const [house, freshLost, storedLost] = await Promise.all([
    pass ? getHouse(pass.houseId).catch(() => null) : Promise.resolve(null),
    lostNow,
    pass ? Promise.resolve(null) : takeNightPassLost(),
  ]);
  const lost = freshLost ?? storedLost;
  const body: NightPassMeResponse = {
    enabled: resolved.enabled,
    viewer: resolved.viewer,
    registered: Boolean(pass),
    ...(pass?.holderName ? { holderName: pass.holderName } : {}),
    ...(pass?.holderPhone ? { holderPhone: maskPhone(pass.holderPhone) } : {}),
    ...(house?.name ? { houseName: house.name } : {}),
    ...(lost ? { lost } : {}),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
