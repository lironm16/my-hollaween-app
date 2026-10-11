import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import {
  normalizeHolderName,
  normalizeIsraeliMobile,
  normalizeNightPassCode,
  passIdForCode,
} from "@/lib/night-pass-codes";
import { readNightPass } from "@/lib/night-pass-store";
import { ownerMayEdit } from "@/lib/owner-session";
import { getHouse } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Owner prefill for «להשתמש בטלפון הזה» — name + phone from the house row. */
export async function GET(request: Request) {
  const code = normalizeNightPassCode(new URL(request.url).searchParams.get("code"));
  if (!code) {
    return NextResponse.json({ name: "", phone: "" }, { headers: NO_STORE });
  }
  const pass = await readNightPass(passIdForCode(code));
  if (!pass) {
    return NextResponse.json({ name: "", phone: "" }, { headers: NO_STORE });
  }
  const admin = await isAdmin();
  if (!admin && !(await ownerMayEdit(pass.houseId))) {
    return NextResponse.json({ name: "", phone: "" }, { headers: NO_STORE });
  }
  const house = await getHouse(pass.houseId);
  if (!house) {
    return NextResponse.json({ name: "", phone: "" }, { headers: NO_STORE });
  }
  const name = normalizeHolderName(house.addedBy ?? "") ?? "";
  const phone = normalizeIsraeliMobile(house.ownerPhone ?? "") ?? "";
  return NextResponse.json({ name, phone }, { headers: NO_STORE });
}
