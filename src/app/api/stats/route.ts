import { NextResponse } from "next/server";
import { buildAdminSnapshot } from "@/lib/admin-snapshot";
import { HOUSE_SETS, type HouseSet } from "@/lib/house-set";
import { countPresence } from "@/lib/presence-store";
import { getDbSnapshot } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseHouseSet(value: string | null): HouseSet {
  if (value && (HOUSE_SETS as readonly string[]).includes(value)) return value as HouseSet;
  return "real";
}

export async function GET(request: Request) {
  const houseSet = parseHouseSet(new URL(request.url).searchParams.get("houseSet"));
  const db = await getDbSnapshot();
  const snapshot = buildAdminSnapshot({
    houses: db.houses,
    subscriptions: [],
    devicesSeen: 0,
    online: countPresence(),
    houseSet,
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
