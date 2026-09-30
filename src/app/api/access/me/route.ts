import { NextResponse } from "next/server";
import { listMyRegistrations } from "@/lib/house-access/service";
import { hasFullCatalogAccess, readAccessSession } from "@/lib/house-access/session";
import { hasAdminBypass } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  if (await hasAdminBypass()) {
    return NextResponse.json({ tier: "full" as const, registrations: [], admin: true });
  }
  const session = await readAccessSession();
  const tier = hasFullCatalogAccess(session) ? ("full" as const) : ("limited" as const);
  const registrations = tier === "full" ? await listMyRegistrations() : [];
  return NextResponse.json({ tier, registrations });
}
