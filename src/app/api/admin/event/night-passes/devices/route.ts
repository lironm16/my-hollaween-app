import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { HOUSE_ACCESS_MAX_DEVICES } from "@/lib/house-access-code";
import { canonicalHouseId } from "@/lib/ids";
import { listAllNightPassRecords, readNightPassSettings } from "@/lib/night-pass-store";
import { isPubliclyListed } from "@/lib/house-state";
import { loadDb } from "@/lib/store/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export type AdminNightPassDeviceRow = {
  id: string;
  name: string;
  connectedCount: number;
  maxDevices: number;
};

export type AdminNightPassDevicesResponse = {
  enabled: boolean;
  maxDevices: number;
  totalConnected: number;
  housesWithDevices: number;
  houses: AdminNightPassDeviceRow[];
};

/** Registered devices per house — admin only. */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  const [settings, records, db] = await Promise.all([
    readNightPassSettings(),
    listAllNightPassRecords(),
    loadDb(),
  ]);
  const connectedByHouse = new Map<string, number>();
  for (const record of records) {
    const id = canonicalHouseId(record.houseId);
    if (!id) continue;
    const n = record.sessions.length;
    connectedByHouse.set(id, (connectedByHouse.get(id) ?? 0) + n);
  }
  const houses: AdminNightPassDeviceRow[] = db.houses
    .filter((house) => isPubliclyListed(house))
    .map((house) => ({
      id: house.id,
      name: house.name?.trim() || house.id,
      connectedCount: connectedByHouse.get(house.id) ?? 0,
      maxDevices: HOUSE_ACCESS_MAX_DEVICES,
    }))
    .sort(
      (a, b) =>
        b.connectedCount - a.connectedCount ||
        a.name.localeCompare(b.name, "he", { sensitivity: "base" }),
    );
  const totalConnected = houses.reduce((sum, row) => sum + row.connectedCount, 0);
  const housesWithDevices = houses.filter((row) => row.connectedCount > 0).length;
  const body: AdminNightPassDevicesResponse = {
    enabled: settings.enabled,
    maxDevices: HOUSE_ACCESS_MAX_DEVICES,
    totalConnected,
    housesWithDevices,
    houses,
  };
  return NextResponse.json(body, { headers: NO_STORE });
}
