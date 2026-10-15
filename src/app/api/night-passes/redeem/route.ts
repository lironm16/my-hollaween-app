import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import {
  normalizeHolderName,
  normalizeIsraeliMobile,
  normalizeNightPassCode,
  passIdForCode,
} from "@/lib/night-pass-codes";
import { redeemNightPass } from "@/lib/night-pass-service";
import { grantOwnerHouse } from "@/lib/owner-session";
import { readNightPassCookie, setNightPassCookie } from "@/lib/night-pass-session";
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
  const ip = clientKey(request.headers);
  if (!(await rateLimitShared(`night-pass:${ip}`, 20, WINDOW_MS))) {
    return fail(429, "rate", "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.");
  }
  if (!code) {
    return fail(404, "invalid", "קוד המשפחה לא נמצא. בדקו שכל 4 התווים נכונים.");
  }
  if (!(await rateLimitShared(`night-pass-code:${passIdForCode(code)}`, 10, WINDOW_MS))) {
    return fail(429, "rate", "יותר מדי ניסיונות לקוד הזה. נסו שוב מאוחר יותר.");
  }

  const cookie = await readNightPassCookie();
  const priorToken =
    cookie && cookie.passId === passIdForCode(code) ? cookie.token : null;

  const outcome = await redeemNightPass({ code, name, phone, priorToken });
  if (!outcome.ok) {
    return fail(404, "invalid", "קוד המשפחה לא נמצא. בדקו שכל 4 התווים נכונים.");
  }
  await setNightPassCookie(outcome.record.id, outcome.token);
  try {
    await grantOwnerHouse(outcome.record.houseId);
  } catch {
    /* optional */
  }
  return NextResponse.json(
    {
      ok: true,
      reregistered: outcome.reregistered,
      evicted: outcome.evicted ?? false,
      houseId: outcome.record.houseId,
    },
    { headers: NO_STORE },
  );
}
