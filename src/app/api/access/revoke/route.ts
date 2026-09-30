import { NextResponse } from "next/server";
import { z } from "zod";
import { canonicalHouseId } from "@/lib/ids";
import { registerBootstrapEditor, revokeSelfFromHouse } from "@/lib/house-access/service";

export const runtime = "nodejs";

const revokeSchema = z.object({
  houseId: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = revokeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים." }, { status: 400 });
  }
  const houseId = canonicalHouseId(parsed.data.houseId);
  const result = await revokeSelfFromHouse(houseId);
  if ("error" in result) {
    if (result.error === "last_editor") {
      return NextResponse.json(
        { error: "לא ניתן להסיר — זה עורך הבית האחרון." },
        { status: 409 },
      );
    }
    if (result.error === "forbidden") {
      return NextResponse.json({ error: "המכשיר לא רשום לבית הזה." }, { status: 403 });
    }
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

const bootstrapSchema = z.object({
  houseId: z.string().min(1),
});

export async function PUT(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bootstrapSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים." }, { status: 400 });
  }
  const houseId = canonicalHouseId(parsed.data.houseId);
  const result = await registerBootstrapEditor(houseId);
  if ("error" in result) {
    if (result.error === "slots_full") {
      return NextResponse.json({ error: "אין מקום במכסה." }, { status: 409 });
    }
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  return NextResponse.json(result);
}
