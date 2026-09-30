import { NextResponse } from "next/server";
import { z } from "zod";
import { canonicalHouseId } from "@/lib/ids";
import { bindDeviceInvite } from "@/lib/house-access/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(8),
  houseId: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים." }, { status: 400 });
  }
  const houseId = canonicalHouseId(parsed.data.houseId);
  const result = await bindDeviceInvite(parsed.data.token, houseId);
  if ("error" in result) {
    if (result.error === "invite_invalid") {
      return NextResponse.json({ error: "ההזמנה לא תקפה או שפג תוקף." }, { status: 410 });
    }
    if (result.error === "slots_full") {
      return NextResponse.json({ error: "אין מקום במכסה." }, { status: 409 });
    }
    return NextResponse.json({ error: "לא הצלחנו לרשום." }, { status: 400 });
  }
  return NextResponse.json(result);
}
