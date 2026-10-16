import { NextResponse } from "next/server";
import { ownerRegisterPrefill } from "@/lib/night-pass-owner-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const houseId = new URL(request.url).searchParams.get("houseId") ?? undefined;
  const prefill = await ownerRegisterPrefill(houseId);
  return NextResponse.json(prefill, { headers: NO_STORE });
}
