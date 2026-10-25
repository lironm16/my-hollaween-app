import { NextResponse } from "next/server";
import { sessionIsOwner } from "@/lib/house-access-role";
import {
  ensureHouseAccess,
  houseAccessSessionForDevice,
  reconcileHouseAccessOwners,
  removeHouseAccessSession,
} from "@/lib/night-pass-service";
import { clearNightPassCookie, currentNightPass, readNightPassCookie } from "@/lib/night-pass-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Clear this device's pass cookie. **Owner** sessions also leave the approved device list;
 * **editor** sessions stay paired — only the cookie on this phone is dropped.
 */
export async function POST() {
  const cookie = await readNightPassCookie();
  const pass = await currentNightPass();
  let removedFromList = false;
  let role: "owner" | "editor" | null = null;
  if (pass && cookie?.sessionId) {
    const record = await ensureHouseAccess(pass.houseId);
    const session = houseAccessSessionForDevice(record, cookie.sessionId, cookie.token);
    role = session ? (sessionIsOwner(session) ? "owner" : "editor") : null;
    if (sessionIsOwner(session)) {
      removedFromList = await removeHouseAccessSession(pass.houseId, cookie.sessionId);
      if (removedFromList) {
        await reconcileHouseAccessOwners(pass.houseId);
      }
    }
  }
  const wasValid = Boolean(pass);
  await clearNightPassCookie();
  return NextResponse.json(
    {
      ok: true,
      wasRegistered: wasValid,
      removedFromList,
      role,
      hadCookie: Boolean(cookie),
    },
    { headers: NO_STORE },
  );
}
