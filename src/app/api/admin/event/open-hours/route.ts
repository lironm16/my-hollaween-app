import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import {
  clearAdminEventOpenHoursSchedule,
  getAdminEventOpenHoursSettings,
  saveAdminEventOpenHoursSchedule,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const settings = await getAdminEventOpenHoursSettings();
  return NextResponse.json(settings, { headers: NO_STORE });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const json = (await request.json().catch(() => null)) as {
    year?: unknown;
    month?: unknown;
    day?: unknown;
    openFrom?: unknown;
    openTo?: unknown;
    reset?: boolean;
  } | null;
  if (json?.reset) {
    try {
      const settings = await clearAdminEventOpenHoursSchedule();
      return NextResponse.json({ ok: true, ...settings }, { headers: NO_STORE });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      return NextResponse.json(
        { error: detail ? `איפוס נכשל: ${detail}` : "איפוס נכשל." },
        { status: 500, headers: NO_STORE },
      );
    }
  }
  const year = Number(json?.year);
  const month = Number(json?.month);
  const day = Number(json?.day);
  const openFrom = typeof json?.openFrom === "string" ? json.openFrom : "";
  const openTo = typeof json?.openTo === "string" ? json.openTo : "";
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || !openFrom || !openTo) {
    return NextResponse.json({ error: "יש למלא תאריך ושעות." }, { status: 400, headers: NO_STORE });
  }
  try {
    const settings = await saveAdminEventOpenHoursSchedule({ year, month, day, openFrom, openTo });
    return NextResponse.json({ ok: true, ...settings }, { headers: NO_STORE });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: detail ? `שמירה נכשלה: ${detail}` : "שמירה נכשלה." },
      { status: 500, headers: NO_STORE },
    );
  }
}
