import { NextResponse } from "next/server";
import {
  reconcileHouseAccessOwners,
  removeHouseAccessSession,
} from "@/lib/night-pass-service";
import { clearNightPassCookie, currentNightPass, readNightPassCookie } from "@/lib/night-pass-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Remove this device from the house access list and clear the pass cookie. */
export async function POST() {
  const cookie = await readNightPassCookie();
  const pass = await currentNightPass();
  let removedFromList = false;
  if (pass && cookie?.sessionId) {
    removedFromList = await removeHouseAccessSession(pass.houseId, cookie.sessionId);
    if (removedFromList) {
      await reconcileHouseAccessOwners(pass.houseId);
    }
  }
  const wasValid = Boolean(pass);
  await clearNightPassCookie();
  return NextResponse.json(
    { ok: true, wasRegistered: wasValid, removedFromList, hadCookie: Boolean(cookie) },
    { headers: NO_STORE },
  );
}
