import { NextResponse } from "next/server";
import { z } from "zod";
import { canonicalHouseId } from "@/lib/ids";
import { cancelDeviceInvite, createDeviceInvite } from "@/lib/house-access/service";

export const runtime = "nodejs";

const createSchema = z.object({
  role: z.enum(["editor", "visitor"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים." }, { status: 400 });
  }
  const result = await createDeviceInvite(id, parsed.data.role);
  if ("error" in result) {
    if (result.error === "forbidden") {
      return NextResponse.json({ error: "רק עורך הבית יכול להוסיף מכשיר." }, { status: 403 });
    }
    if (result.error === "slots_full") {
      return NextResponse.json({ error: "אין מקום — הגעתם למכסה." }, { status: 409 });
    }
    return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
  }
  return NextResponse.json(result);
}

const deleteSchema = z.object({
  pendingId: z.string().min(1),
});

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const json = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים." }, { status: 400 });
  }
  const result = await cancelDeviceInvite(id, parsed.data.pendingId);
  if ("error" in result) {
    if (result.error === "forbidden") {
      return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
    }
    return NextResponse.json({ error: "ההזמנה לא נמצאה." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
