import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import type {
  AdminNightPassDeviceRow,
  AdminNightPassDevicesResponse,
} from "@/lib/admin-night-pass-devices";
import { HOUSE_ACCESS_MAX_DEVICES } from "@/lib/house-access-code";
import { canonicalHouseId } from "@/lib/ids";
import { listAllNightPassRecords, readNightPassSettings } from "@/lib/night-pass-store";
import { isPubliclyListed } from "@/lib/house-state";
import { getDbSnapshot, getHouse } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

function rowsFromDb(
  connectedByHouse: Map<string, number>,
  houses: { id: string; name: string }[],
): AdminNightPassDeviceRow[] {
  return houses
    .map((house) => ({
      id: house.id,
      name: (house.name ?? "").trim() || house.id,
      connectedCount: connectedByHouse.get(house.id) ?? 0,
      maxDevices: HOUSE_ACCESS_MAX_DEVICES,
    }))
    .sort(
      (a, b) =>
        b.connectedCount - a.connectedCount ||
        a.name.localeCompare(b.name, "he", { sensitivity: "base" }),
    );
}

/** Registered devices per house — admin only. */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401, headers: NO_STORE });
  }
  try {
    const [settings, records] = await Promise.all([
      readNightPassSettings(),
      listAllNightPassRecords(),
    ]);
    const connectedByHouse = new Map<string, number>();
    for (const record of records) {
      const id = canonicalHouseId(record.houseId);
      if (!id) continue;
      const sessionCount = Array.isArray(record.sessions) ? record.sessions.length : 0;
      connectedByHouse.set(id, (connectedByHouse.get(id) ?? 0) + sessionCount);
    }

    let houses: AdminNightPassDeviceRow[] = [];
    try {
      const db = await getDbSnapshot();
      const listed = (db.houses ?? []).filter((house) => isPubliclyListed(house));
      houses = rowsFromDb(
        connectedByHouse,
        listed.map((house) => ({ id: house.id, name: house.name ?? "" })),
      );
    } catch (dbError) {
      console.error("[admin/night-passes/devices] house list fallback", dbError);
      const ids = [...new Set([...connectedByHouse.keys()])];
      const names = await Promise.all(
        ids.map(async (id) => {
          const house = await getHouse(id).catch(() => null);
          return { id, name: house?.name?.trim() || id };
        }),
      );
      houses = names
        .map(({ id, name }) => ({
          id,
          name,
          connectedCount: connectedByHouse.get(id) ?? 0,
          maxDevices: HOUSE_ACCESS_MAX_DEVICES,
        }))
        .sort(
          (a, b) =>
            b.connectedCount - a.connectedCount ||
            a.name.localeCompare(b.name, "he", { sensitivity: "base" }),
        );
    }

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
  } catch (error) {
    console.error("[admin/night-passes/devices] failed", error);
    const detail = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: detail ? `טעינה נכשלה: ${detail}` : "טעינה נכשלה." },
      { status: 500, headers: NO_STORE },
    );
  }
}
