import { NextResponse } from "next/server";
import { getHouse } from "@/lib/store";
import { toPublicHouse } from "@/lib/ids";
import { grantOwnerHouse } from "@/lib/owner-session";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
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
