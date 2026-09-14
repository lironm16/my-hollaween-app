import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { resetPushTemplates } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const templates = await resetPushTemplates();
  return NextResponse.json({ ok: true, templates }, { headers: NO_STORE });
}
