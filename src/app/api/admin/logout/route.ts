import { NextResponse } from "next/server";
import { clearAdminCookie, clearAdminUserPreviewMode } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST() {
  await clearAdminUserPreviewMode();
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
