import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { registerOwnerDeviceWithContact } from "@/lib/night-pass-owner-connect";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { clientKey } from "@/lib/rate-limit";
import { rateLimitShared } from "@/lib/rate-limit-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const WINDOW_MS = 15 * 60 * 1000;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!(await readNightPassSettings()).enabled && !(await isAdmin())) {
    return fail(404, "ההרשמה עוד לא פתוחה.");
  }
  const json = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const houseId = typeof json?.houseId === "string" ? json.houseId : "";
  const name = typeof json?.name === "string" ? json.name : "";
  const phone = typeof json?.phone === "string" ? json.phone : "";
  if (!houseId.trim()) return fail(400, "לא נמצא בית לעריכה.");

  const ip = clientKey(request.headers);
  if (!(await rateLimitShared(`night-pass-owner:${ip}`, 20, WINDOW_MS))) {
    return fail(429, "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.");
  }

  const outcome = await registerOwnerDeviceWithContact({ houseId, name, phone });
  if (!outcome.ok) {
    if (outcome.error === "name") return fail(400, "נא לכתוב שם (2–40 תווים).");
    if (outcome.error === "phone") return fail(400, "נא לכתוב מספר נייד ישראלי, למשל 050-1234567.");
    if (outcome.error === "forbidden") return fail(403, "אין הרשאת עריכה לבית הזה.");
    if (outcome.error === "already") return fail(409, "המכשיר כבר רשום.");
    return fail(404, "לא הצלחנו לרשום. נסו שוב.");
  }

  return NextResponse.json(
    {
      ok: true,
      reregistered: outcome.reregistered,
      evicted: outcome.evicted ?? false,
      houseId: outcome.houseId,
      editCode: outcome.editCode,
      house: outcome.house,
    },
    { headers: NO_STORE },
  );
}
