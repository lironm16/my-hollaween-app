import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import {
  normalizeHolderName,
  normalizeIsraeliMobile,
  normalizeHouseAccessCode,
} from "@/lib/house-access-code";
import { ownerMayEdit } from "@/lib/owner-session";
import { getHouseByAccessCode } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Owner prefill for «להשתמש בטלפון הזה» — name + phone from the house row. */
export async function GET(request: Request) {
  const code = normalizeHouseAccessCode(new URL(request.url).searchParams.get("code"));
  if (!code) {
    return NextResponse.json({ name: "", phone: "" }, { headers: NO_STORE });
  }
  const house = await getHouseByAccessCode(code);
  if (!house) {
    return NextResponse.json({ name: "", phone: "" }, { headers: NO_STORE });
  }
  const admin = await isAdmin();
  if (!admin && !(await ownerMayEdit(house.id))) {
    return NextResponse.json({ name: "", phone: "" }, { headers: NO_STORE });
  }
  const name = normalizeHolderName(house.addedBy ?? "") ?? "";
  const phone = normalizeIsraeliMobile(house.ownerPhone ?? "") ?? "";
  return NextResponse.json({ name, phone }, { headers: NO_STORE });
}
