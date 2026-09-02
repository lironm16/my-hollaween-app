import { NextResponse } from "next/server";
import { getHouse } from "@/lib/store";
import { toPublicHouse } from "@/lib/ids";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { editCode?: string } | null;
  const house = await getHouse(id);
  if (!house || !body?.editCode || house.editCode !== body.editCode) {
    return NextResponse.json(
      { error: "קוד העריכה שגוי או שהבית לא נמצא." },
      { status: 403 },
    );
  }
  return NextResponse.json({ house: toPublicHouse(house) });
}
