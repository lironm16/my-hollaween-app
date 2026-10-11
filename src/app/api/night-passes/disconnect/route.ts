import { NextResponse } from "next/server";
import { clearNightPassCookie, currentNightPass, readNightPassCookie } from "@/lib/night-pass-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Drop this device's pass cookie only — the slot stays paired on the server. */
export async function POST() {
  const hadCookie = Boolean(await readNightPassCookie());
  const wasValid = Boolean(await currentNightPass());
  await clearNightPassCookie();
  return NextResponse.json(
    { ok: true, wasRegistered: wasValid, hadCookie },
    { headers: NO_STORE },
  );
}
