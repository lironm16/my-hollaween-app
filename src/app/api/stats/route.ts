import { NextResponse } from "next/server";
import { buildAdminSnapshot } from "@/lib/admin-snapshot";
import { countPresence } from "@/lib/presence-store";
import { getDbSnapshot } from "@/lib/store";
import { getHouseTraffic } from "@/lib/traffic-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [db, traffic] = await Promise.all([getDbSnapshot(), getHouseTraffic()]);
  const snapshot = buildAdminSnapshot({
    houses: db.houses,
    subscriptions: [],
    devicesSeen: 0,
    online: countPresence(),
    traffic,
    houseSet: "real",
  });
  return NextResponse.json({
    houses: snapshot.houses,
    online: snapshot.online,
    openNow: snapshot.openNow,
    openingSoon: snapshot.openingSoon,
    closingSoon: snapshot.closingSoon,
    onBreak: snapshot.onBreak,
    closed: snapshot.closed,
    candyNone: snapshot.candyNone,
    candyPlenty: snapshot.candyPlenty,
    candyLow: snapshot.candyLow,
    candyOut: snapshot.candyOut,
    hearts: snapshot.hearts,
    visited: snapshot.visited,
    notDecorated: snapshot.notDecorated,
    scareMild: snapshot.scareMild,
    scareMedium: snapshot.scareMedium,
    scareSpicy: snapshot.scareSpicy,
    accessible: snapshot.accessible,
    glutenFree: snapshot.glutenFree,
    nutsFree: snapshot.nutsFree,
    sesameFree: snapshot.sesameFree,
  });
}
