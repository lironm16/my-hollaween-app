import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import {
  clearAdminAddHouseCutoffSchedule,
  getAdminAddHouseCutoffSettings,
  saveAdminAddHouseCutoffSchedule,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const settings = await getAdminAddHouseCutoffSettings();
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
    hour?: unknown;
    minute?: unknown;
    reset?: boolean;
  } | null;
  if (json?.reset) {
    try {
      const settings = await clearAdminAddHouseCutoffSchedule();
      return NextResponse.json({ ok: true, ...settings }, { headers: NO_STORE });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      return NextResponse.json(
        { error: detail ? `איפוס המועד נכשל: ${detail}` : "איפוס המועד נכשל." },
        { status: 500, headers: NO_STORE },
      );
    }
  }
  const year = Number(json?.year);
  const month = Number(json?.month);
  const day = Number(json?.day);
  const hour = Number(json?.hour);
  const minute = Number(json?.minute);
  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return NextResponse.json({ error: "יש לבחור תאריך ושעה תקינים." }, { status: 400, headers: NO_STORE });
  }
  try {
    const settings = await saveAdminAddHouseCutoffSchedule({ year, month, day, hour, minute });
    return NextResponse.json({ ok: true, ...settings }, { headers: NO_STORE });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: detail ? `שמירת המועד נכשלה: ${detail}` : "שמירת המועד נכשלה." },
      { status: 500, headers: NO_STORE },
    );
  }
}
