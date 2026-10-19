import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createHouseAccessInviteToken, houseAccessInviteUrl } from "@/lib/house-access-invite";
import { canonicalHouseId } from "@/lib/ids";
import { primaryOwnerMayManage } from "@/lib/owner-session";
import { getHouse } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const admin = await isAdmin();
  if (!admin && !(await primaryOwnerMayManage(id))) {
    return NextResponse.json(
      { error: "רק בעל/ת הבית יכול/ה ליצור הזמנות." },
      { status: 403, headers: NO_STORE },
    );
  }
  const house = await getHouse(id);
  if (!house) {
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404, headers: NO_STORE });
  }
  const token = createHouseAccessInviteToken(house.id);
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const url = houseAccessInviteUrl(token, origin || undefined);
  return NextResponse.json({ ok: true, token, url }, { headers: NO_STORE });
}
