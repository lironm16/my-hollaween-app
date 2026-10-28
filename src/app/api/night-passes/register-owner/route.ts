import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import {
  parseNightPassClientBrowser,
  parseNightPassClientSurface,
} from "@/lib/night-pass-client-surface";
import { registerOwnerDeviceWithContact } from "@/lib/night-pass-owner-connect";
import { nightPassRegisterErrorMessage } from "@/lib/night-pass-register-errors";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { clientKey } from "@/lib/rate-limit";
import { rateLimitShared } from "@/lib/rate-limit-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const WINDOW_MS = 15 * 60 * 1000;

function fail(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!(await readNightPassSettings()).enabled && !(await isAdmin())) {
    return fail(404, "disabled", "ההרשמה עוד לא פתוחה.");
  }
  const json = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const houseId = typeof json?.houseId === "string" ? json.houseId : "";
  const name = typeof json?.name === "string" ? json.name : "";
  const phone = typeof json?.phone === "string" ? json.phone : "";
  if (!houseId.trim()) return fail(400, "house", "לא נמצא בית לעריכה.");

  const ip = clientKey(request.headers);
  if (!(await rateLimitShared(`night-pass-owner:${ip}`, 20, WINDOW_MS))) {
    return fail(429, "rate", "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.");
  }

  const clientSurface = parseNightPassClientSurface(json?.clientSurface);
  const clientBrowser = parseNightPassClientBrowser(json?.clientBrowser);
  const outcome = await registerOwnerDeviceWithContact({
    houseId,
    name,
    phone,
    clientSurface,
    clientBrowser,
  });
  if (!outcome.ok) {
    if (outcome.error === "name") return fail(400, "name", "נא לכתוב שם (2–40 תווים).");
    if (outcome.error === "phone") return fail(400, "phone", "נא לכתוב מספר נייד ישראלי, למשל 050-1234567.");
    if (outcome.error === "forbidden") return fail(403, "forbidden", "אין הרשאת עריכה לבית הזה.");
    if (outcome.error === "already") return fail(409, "already", "המכשיר כבר רשום.");
    if (outcome.error === "full" || outcome.error === "duplicate_identity") {
      return fail(409, outcome.error, nightPassRegisterErrorMessage(outcome.error));
    }
    return fail(404, "invalid", "לא הצלחנו לרשום. נסו שוב.");
  }

  return NextResponse.json(
    {
      ok: true,
      reregistered: outcome.reregistered,
      evicted: false,
      houseId: outcome.houseId,
      editCode: outcome.editCode,
      house: outcome.house,
    },
    { headers: NO_STORE },
  );
}
