import { NextResponse } from "next/server";
import { clearNightPassCookie, currentNightPass } from "@/lib/night-pass-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Drop this device's pass cookie only — the slot stays paired on the server. */
export async function POST() {
  if (!(await currentNightPass())) {
    return NextResponse.json({ ok: true, wasRegistered: false }, { headers: NO_STORE });
  }
  await clearNightPassCookie();
  return NextResponse.json({ ok: true, wasRegistered: true }, { headers: NO_STORE });
}
