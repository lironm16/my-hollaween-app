import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import {
  clearAdminAddressRevealSchedule,
  getAdminAddressRevealSettings,
  saveAdminAddressRevealSchedule,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const settings = await getAdminAddressRevealSettings();
  return NextResponse.json(settings, { headers: NO_STORE });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const json = (await request.json().catch(() => null)) as {
    hour?: unknown;
    minute?: unknown;
    reset?: boolean;
  } | null;
  if (json?.reset) {
    try {
      const settings = await clearAdminAddressRevealSchedule();
      return NextResponse.json({ ok: true, ...settings }, { headers: NO_STORE });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      return NextResponse.json(
        { error: detail ? `איפוס השעה נכשל: ${detail}` : "איפוס השעה נכשל." },
        { status: 500, headers: NO_STORE },
      );
    }
  }
  const hour = Number(json?.hour);
  const minute = Number(json?.minute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return NextResponse.json({ error: "יש לבחור שעה ודקות." }, { status: 400, headers: NO_STORE });
  }
  try {
    const settings = await saveAdminAddressRevealSchedule({ hour, minute });
    return NextResponse.json({ ok: true, ...settings }, { headers: NO_STORE });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: detail ? `שמירת השעה נכשלה: ${detail}` : "שמירת השעה נכשלה." },
      { status: 500, headers: NO_STORE },
    );
  }
}
