import { NextResponse } from "next/server";
import { tryConnectOwnerDeviceForEvent } from "@/lib/night-pass-owner-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Owner already unlocked a house — register device when entrance codes go live (or on return visit). */
export async function POST() {
  const outcome = await tryConnectOwnerDeviceForEvent();
  return NextResponse.json(outcome, { headers: NO_STORE });
}
