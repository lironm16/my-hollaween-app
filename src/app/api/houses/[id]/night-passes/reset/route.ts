import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { canonicalHouseId } from "@/lib/ids";
import { nightPassSlotView, resetNightPassSlot } from "@/lib/night-pass-service";
import { NIGHT_PASS_SLOTS, readNightPassSettings, type NightPassSlot } from "@/lib/night-pass-store";
import { ownerMayEdit } from "@/lib/owner-session";
import { getHouse } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const admin = await isAdmin();
  if (!admin && !(await ownerMayEdit(id))) {
    return NextResponse.json({ error: "צריך לפתוח את הבית לעריכה." }, { status: 403, headers: NO_STORE });
  }
  if (!admin && !(await readNightPassSettings()).enabled) {
    return NextResponse.json({ error: "הכרטיסים עוד לא פעילים." }, { status: 404, headers: NO_STORE });
  }
  const json = (await request.json().catch(() => null)) as { slot?: unknown } | null;
  const slot = Number(json?.slot);
  if (!NIGHT_PASS_SLOTS.includes(slot as NightPassSlot)) {
    return NextResponse.json({ error: "כרטיס לא תקין." }, { status: 400, headers: NO_STORE });
  }
  const house = await getHouse(id);
  if (!house) return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404, headers: NO_STORE });
  const outcome = await resetNightPassSlot(house.id, slot as NightPassSlot, { admin });
  if (!outcome.ok) {
    return NextResponse.json(
      {
        error:
          outcome.error === "limit"
            ? "הגעתם למספר האיפוסים לכרטיס הזה. פנו למארגנים."
            : "הכרטיס לא נמצא.",
      },
      { status: outcome.error === "limit" ? 429 : 404, headers: NO_STORE },
    );
  }
  return NextResponse.json({ ok: true, slot: nightPassSlotView(outcome.record, admin) }, { headers: NO_STORE });
}
