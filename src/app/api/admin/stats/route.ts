import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { buildAdminSnapshot } from "@/lib/admin-snapshot";
import { HOUSE_SETS, type HouseSet } from "@/lib/house-set";
import { countSeenDevices } from "@/lib/device-store";
import { countPresence } from "@/lib/presence-store";
import { getDbSnapshot } from "@/lib/store";
import { getHouseTraffic } from "@/lib/traffic-store";

export const runtime = "nodejs";

function parseHouseSet(value: string | null): HouseSet {
  if (value && (HOUSE_SETS as readonly string[]).includes(value)) return value as HouseSet;
  return "real";
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const houseSet = parseHouseSet(new URL(request.url).searchParams.get("houseSet"));
  const [db, devicesSeen, traffic] = await Promise.all([
    getDbSnapshot(),
    countSeenDevices(),
    getHouseTraffic(),
  ]);
  return NextResponse.json(
    buildAdminSnapshot({
      houses: db.houses,
      subscriptions: db.pushSubscriptions ?? [],
      devicesSeen,
      online: countPresence(),
      traffic,
      houseSet,
    }),
  );
}
