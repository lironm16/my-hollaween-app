import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { adminPatchSchema } from "@/lib/schema";
import { adminUpdate } from "@/lib/store";
import { geocodeHttpError } from "@/lib/geocode";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const { id } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = adminPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים." }, { status: 400 });
  }
  try {
    const house = await adminUpdate(id, parsed.data);
    if (!house) {
      return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404 });
    }
    return NextResponse.json({ house });
  } catch (error) {
    const geo = geocodeHttpError(error);
    if (geo) return NextResponse.json({ error: geo.error }, { status: geo.status });
    throw error;
  }
}
