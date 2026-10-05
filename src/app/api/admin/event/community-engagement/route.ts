import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import {
  getAdminCommunityEngagementSettings,
  saveAdminCommunityEngagementEnabled,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const settings = await getAdminCommunityEngagementSettings();
  return NextResponse.json(settings, { headers: NO_STORE });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const json = (await request.json().catch(() => null)) as { enabled?: unknown } | null;
  const enabled = Boolean(json?.enabled);
  const settings = await saveAdminCommunityEngagementEnabled(enabled);
  return NextResponse.json({ ok: true, ...settings }, { headers: NO_STORE });
}
