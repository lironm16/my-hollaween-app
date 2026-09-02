import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { adminPatchSchema } from "@/lib/schema";
import { adminUpdate } from "@/lib/store";

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
    if (error instanceof Error && error.message === "OUT_OF_BOUNDS") {
      return NextResponse.json(
        { error: "המיקום מחוץ לגבולות השכונה." },
        { status: 400 },
      );
    }
    throw error;
  }
}
