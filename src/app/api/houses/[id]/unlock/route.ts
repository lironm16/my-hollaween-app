import { NextResponse } from "next/server";
import { getHouse } from "@/lib/store";
import { canonicalHouseId, toPublicHouse } from "@/lib/ids";
import { grantOwnerHouse } from "@/lib/owner-session";
import { clientKey } from "@/lib/rate-limit";
import { rateLimitShared } from "@/lib/rate-limit-store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ip = clientKey(request.headers);
  if (!(await rateLimitShared(`unlock:${ip}`, 30, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." }, { status: 429 });
  }
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  if (!(await rateLimitShared(`unlock:${ip}:${id}`, 12, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "יותר מדי ניסיונות לבית הזה." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { editCode?: string } | null;
  const house = await getHouse(id);
  if (!house) {
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  if (!body?.editCode || house.editCode !== body.editCode) {
    return NextResponse.json({ error: "קוד העריכה שגוי." }, { status: 403 });
  }
  await grantOwnerHouse(id);
  return NextResponse.json({ house: toPublicHouse(house) });
}
