import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { buildAdminSnapshot } from "@/lib/admin-snapshot";
import { countSeenDevices } from "@/lib/device-store";
import { countPresence } from "@/lib/presence-store";
import { getDbSnapshot } from "@/lib/store";
import { getHouseTraffic } from "@/lib/traffic-store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
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
      houseSet: "real",
    }),
  );
}
