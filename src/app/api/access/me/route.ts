import { NextResponse } from "next/server";
import { listMyRegistrations } from "@/lib/house-access/service";
import { accessGateEnabled } from "@/lib/house-access/config";
import { hasFullCatalogAccess, readAccessSession } from "@/lib/house-access/session";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!accessGateEnabled()) {
    return NextResponse.json({ gate: false, tier: "full" as const, registrations: [] });
  }
  if (await isAdmin()) {
    return NextResponse.json({ gate: true, tier: "full" as const, registrations: [], admin: true });
  }
  const session = await readAccessSession();
  const tier = hasFullCatalogAccess(session) ? ("full" as const) : ("limited" as const);
  const registrations = tier === "full" ? await listMyRegistrations() : [];
  return NextResponse.json({ gate: true, tier, registrations });
}
