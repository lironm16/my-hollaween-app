import { NextResponse } from "next/server";
import { parseHouseAccessInviteToken } from "@/lib/house-access-invite";
import { getHouse } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const invite = new URL(request.url).searchParams.get("invite") ?? "";
  const parsed = parseHouseAccessInviteToken(invite);
  if (!parsed) {
    return NextResponse.json({ ok: false }, { headers: NO_STORE });
  }
  const house = await getHouse(parsed.houseId);
  if (!house?.editCode?.trim()) {
    return NextResponse.json(
      { ok: false, reason: "house_unavailable" as const },
      { headers: NO_STORE },
    );
  }
  return NextResponse.json(
    { ok: true, houseId: house.id, houseName: house.name },
    { headers: NO_STORE },
  );
}
