import { distanceMeters } from "@/lib/geo";

const OSRM_NEAREST = [
  "https://routing.openstreetmap.de/routed-foot/nearest/v1/foot",
  "https://router.project-osrm.org/nearest/v1/foot",
];
const UA = "bashchona-halloween/1.0 (gem sidewalk snap)";
export const GEM_OSM_SNAP_MAX_PIN_DISTANCE_M = 95;

export type GemOsrmSnap = {
  lat: number;
  lng: number;
  distanceM: number;
  source: "osrm";
};

export async function osrmNearestFootWalk(
  house: { lat: number; lng: number },
): Promise<GemOsrmSnap | null> {
  for (const base of OSRM_NEAREST) {
    const url = `${base}/${house.lng.toFixed(6)},${house.lat.toFixed(6)}?number=1`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        code?: string;
        waypoints?: { location: [number, number] }[];
      };
      if (json.code !== "Ok" || !json.waypoints?.[0]) continue;
      const wp = json.waypoints[0];
      const lng = wp.location[0];
      const lat = wp.location[1];
      const distanceM = distanceMeters(house, { lat, lng });
      if (distanceM > GEM_OSM_SNAP_MAX_PIN_DISTANCE_M) continue;
      return { lat, lng, distanceM, source: "osrm" };
    } catch {
      /* try next endpoint */
    }
  }
  return null;
}

export async function snapHousesToWalkNetwork(
  houses: { id: string; lat: number; lng: number }[],
  opts?: { gapMs?: number; concurrency?: number },
) {
  const gapMs = opts?.gapMs ?? 80;
  const concurrency = opts?.concurrency ?? 4;
  const out: Record<string, GemOsrmSnap> = {};
  let index = 0;

  async function worker() {
    while (index < houses.length) {
      const i = index;
      index += 1;
      const house = houses[i]!;
      const snap = await osrmNearestFootWalk(house);
      if (snap) out[house.id] = snap;
      if (i < houses.length - 1) await new Promise((r) => setTimeout(r, gapMs));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, houses.length) }, () => worker()));
  return out;
}
