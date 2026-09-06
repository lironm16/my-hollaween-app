import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getDbSnapshot } from "@/lib/store";
import { countSeenDevices } from "@/lib/device-store";
import { candyLevel, effectiveVisit, isOwnerFrozen } from "@/lib/house-state";
import { isOnBreak, isOpenNow } from "@/lib/hours";
import { countPresence } from "@/lib/presence-store";
import { subscriptionAllowsTopic } from "@/lib/push-topics";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const db = await getDbSnapshot();
  const now = new Date();
  const subs = db.pushSubscriptions ?? [];
  const houses = db.houses.filter((house) => house.status !== "rejected");
  const approved = houses.filter((house) => house.status === "approved");
  const [devicesSeen] = await Promise.all([countSeenDevices()]);
  return NextResponse.json({
    devices: subs.length,
    devicesSeen,
    online: countPresence(),
    devicesNewHouse: subs.filter((item) => subscriptionAllowsTopic(item, "newHouse")).length,
    devicesHouseStatus: subs.filter((item) => subscriptionAllowsTopic(item, "houseStatus")).length,
    devicesAdmin: subs.filter((item) => subscriptionAllowsTopic(item, "admin")).length,
    houses: approved.length,
    pending: houses.filter((house) => house.status === "pending").length,
    openNow: approved.filter((house) => isOpenNow(house, now)).length,
    onBreak: approved.filter((house) => isOwnerFrozen(house) || isOnBreak(house, now)).length,
    closed: approved.filter((house) => effectiveVisit(house) === "closed").length,
    candyLow: approved.filter((house) => candyLevel(house) === "low").length,
    candyOut: approved.filter((house) => candyLevel(house) === "out").length,
  });
}
