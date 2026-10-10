import { NextResponse } from "next/server";
import { maskPhone } from "@/lib/night-pass-codes";
import { readAsUserParam, resolveNightPassViewer } from "@/lib/night-pass-session";
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
};

export async function GET(request: Request) {
  const resolved = await resolveNightPassViewer({ asUser: readAsUserParam(request) });
  const pass = resolved.enabled ? resolved.pass : null;
  const house = pass ? await getHouse(pass.houseId).catch(() => null) : null;
  const body: NightPassMeResponse = {
    enabled: resolved.enabled,
    viewer: resolved.viewer,
    registered: Boolean(pass),
    ...(pass?.holderName ? { holderName: pass.holderName } : {}),
    ...(pass?.holderPhone ? { holderPhone: maskPhone(pass.holderPhone) } : {}),
    ...(house?.name ? { houseName: house.name } : {}),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
