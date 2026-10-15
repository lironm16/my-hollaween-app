import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { parseHouseAccessInviteToken } from "@/lib/house-access-invite";
import { normalizeHolderName, normalizeIsraeliMobile } from "@/lib/house-access-code";
import { registerHouseAccessDevice } from "@/lib/night-pass-service";
import { grantOwnerHouse } from "@/lib/owner-session";
import { readNightPassCookie, setNightPassCookie } from "@/lib/night-pass-session";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { getHouse } from "@/lib/store";
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
  const parsed = parseHouseAccessInviteToken(json?.invite ?? json?.token);
  const name = normalizeHolderName(json?.name);
  const phone = normalizeIsraeliMobile(json?.phone);
  if (!parsed) return fail(400, "invite", "ההזמנה לא תקפה או שפג תוקפה.");
  if (!name) return fail(400, "name", "נא לכתוב שם (2–40 תווים).");
  if (!phone) return fail(400, "phone", "נא לכתוב מספר נייד ישראלי, למשל 050-1234567.");

  const house = await getHouse(parsed.houseId);
  if (!house) return fail(404, "house", "הבית לא נמצא.");

  const ip = clientKey(request.headers);
  if (!(await rateLimitShared(`night-pass-invite:${ip}`, 20, WINDOW_MS))) {
    return fail(429, "rate", "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.");
  }

  const cookie = await readNightPassCookie();
  const outcome = await registerHouseAccessDevice({
    houseId: house.id,
    name,
    phone,
    priorSessionId: cookie?.sessionId ?? null,
  });
  if (!outcome.ok) {
    return fail(500, "register", "ההרשמה נכשלה. נסו שוב.");
  }
  await setNightPassCookie(outcome.record.id, outcome.sessionId, outcome.token);
  try {
    await grantOwnerHouse(house.id);
  } catch {
    /* optional */
  }
  return NextResponse.json(
    {
      ok: true,
      houseId: house.id,
      evicted: outcome.evicted ?? false,
      reregistered: outcome.reregistered,
    },
    { headers: NO_STORE },
  );
}
