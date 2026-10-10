import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import {
  normalizeHolderName,
  normalizeIsraeliMobile,
  normalizeNightPassCode,
  passIdForCode,
} from "@/lib/night-pass-codes";
import { redeemNightPass } from "@/lib/night-pass-service";
import { currentNightPass, setNightPassCookie } from "@/lib/night-pass-session";
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
  const code = normalizeNightPassCode(json?.code);
  const name = normalizeHolderName(json?.name);
  const phone = normalizeIsraeliMobile(json?.phone);
  if (!name) return fail(400, "name", "נא לכתוב שם (2–40 תווים).");
  if (!phone) return fail(400, "phone", "נא לכתוב מספר נייד ישראלי, למשל 050-1234567.");
  if (json?.consent !== true) return fail(400, "consent", "צריך לאשר את שיתוף הפרטים.");

  const ip = clientKey(request.headers);
  if (!(await rateLimitShared(`night-pass:${ip}`, 20, WINDOW_MS))) {
    return fail(429, "rate", "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.");
  }
  if (!code) return fail(404, "invalid", "הקוד לא נמצא. בדקו שהעתקתם את כל 8 התווים.");
  if (!(await rateLimitShared(`night-pass-code:${passIdForCode(code)}`, 10, WINDOW_MS))) {
    return fail(429, "rate", "יותר מדי ניסיונות לקוד הזה. נסו שוב מאוחר יותר.");
  }

  const existing = await currentNightPass();
  if (existing && existing.id !== passIdForCode(code)) {
    return fail(409, "device_has_other", "המכשיר הזה כבר רשום עם קוד אחר.");
  }

  const outcome = await redeemNightPass({ code, name, phone });
  if (!outcome.ok) {
    if (outcome.error === "phone_mismatch") {
      return fail(
        409,
        "phone_mismatch",
        "הקוד כבר רשום למספר טלפון אחר. אם זה הקוד שלכם — הזינו את אותו מספר טלפון. אחרת בקשו קוד חדש מבעלי הבית.",
      );
    }
    return fail(404, "invalid", "הקוד לא נמצא. בדקו שהעתקתם את כל 8 התווים.");
  }
  await setNightPassCookie(outcome.record.id, outcome.token);
  return NextResponse.json(
    { ok: true, reregistered: outcome.reregistered, holderName: outcome.record.holderName },
    { headers: NO_STORE },
  );
}
