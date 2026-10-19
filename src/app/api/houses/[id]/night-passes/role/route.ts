import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { normalizeHouseAccessRole, type HouseAccessRole } from "@/lib/house-access-role";
import { canonicalHouseId } from "@/lib/ids";
import {
  adminSetHouseAccessSessionRole,
  updateHouseAccessSessionRole,
} from "@/lib/night-pass-service";
import { deviceSessionOnHouse } from "@/lib/night-pass-session";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { getHouse } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

function roleErrorResponse(error: "missing" | "forbidden" | "last_owner") {
  if (error === "forbidden") {
    return NextResponse.json({ error: "אין הרשאה לשנות תפקיד." }, { status: 403, headers: NO_STORE });
  }
  if (error === "last_owner") {
    return NextResponse.json(
      { error: "חייב להישאר לפחות בעל/ת בית אחד/ת." },
      { status: 409, headers: NO_STORE },
    );
  }
  return NextResponse.json({ error: "המכשיר לא נמצא." }, { status: 404, headers: NO_STORE });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const admin = await isAdmin();
  if (!admin && !(await readNightPassSettings()).enabled) {
    return NextResponse.json({ error: "קודי הכניסה עוד לא פעילים." }, { status: 404, headers: NO_STORE });
  }
  const json = (await request.json().catch(() => null)) as {
    sessionId?: string;
    role?: string;
  } | null;
  const targetSessionId = typeof json?.sessionId === "string" ? json.sessionId.trim() : "";
  const role = normalizeHouseAccessRole(json?.role) as HouseAccessRole;
  if (!targetSessionId) {
    return NextResponse.json({ error: "לא נמצא מכשיר." }, { status: 400, headers: NO_STORE });
  }
  const house = await getHouse(id);
  if (!house) return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404, headers: NO_STORE });

  if (admin) {
    const outcome = await adminSetHouseAccessSessionRole(house.id, targetSessionId, role);
    if (!outcome.ok) return roleErrorResponse(outcome.error);
    return NextResponse.json({ ok: true, role }, { headers: NO_STORE });
  }

  const caller = await deviceSessionOnHouse(id);
  if (!caller) {
    return NextResponse.json({ error: "צריך מכשיר רשום לבית הזה." }, { status: 403, headers: NO_STORE });
  }

  const outcome = await updateHouseAccessSessionRole({
    houseId: house.id,
    targetSessionId,
    role,
    callerSessionId: caller.sessionId,
  });
  if (!outcome.ok) return roleErrorResponse(outcome.error);
  return NextResponse.json({ ok: true, role }, { headers: NO_STORE });
}
