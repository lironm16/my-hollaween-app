import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { canonicalHouseId } from "@/lib/ids";
import { houseAccessView, mayManageHouseDevices, resetHouseAccess } from "@/lib/night-pass-service";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { getHouse, replaceHouseEditCode } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** New family code — all devices must reconnect. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = canonicalHouseId(rawId);
  const admin = await isAdmin();
  if (!(await mayManageHouseDevices(id, { admin }))) {
    return NextResponse.json(
      { error: "רק בעל בית יכול לאפס קוד." },
      { status: 403, headers: NO_STORE },
    );
  }
  if (!admin && !(await readNightPassSettings()).enabled) {
    return NextResponse.json({ error: "קודי הכניסה עוד לא פעילים." }, { status: 404, headers: NO_STORE });
  }
  const house = await getHouse(id);
  if (!house) return NextResponse.json({ error: "הבית לא נמצא." }, { status: 404, headers: NO_STORE });
  const outcome = await resetHouseAccess(house.id);
  if (!outcome.ok) {
    return NextResponse.json({ error: "קוד המשפחה לא נמצא." }, { status: 404, headers: NO_STORE });
  }
  const rotated = await replaceHouseEditCode(house.id, outcome.newCode);
  if ("error" in rotated) {
    return NextResponse.json(
      { error: "המכשירים נותקו אך קוד הכניסה לא עודכן — נסו שוב או פנו למנהל." },
      { status: 500, headers: NO_STORE },
    );
  }
  return NextResponse.json(
    {
      ok: true,
      editCode: rotated.house.editCode,
      access: houseAccessView(outcome.record, rotated.house.editCode, null, null),
    },
    { headers: NO_STORE },
  );
}
