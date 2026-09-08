export type HouseTraffic = {
  saved: number;
  routed: number;
  visited: number;
};

export type TrafficKind = keyof HouseTraffic;

export type TrafficFile = {
  updatedAt: string;
  houses: Record<string, HouseTraffic>;
};

export type TrafficDelta = { houseId: string; kind: TrafficKind; delta: number };

export const TRAFFIC_KINDS: TrafficKind[] = ["saved", "routed", "visited"];
export const EMPTY_TRAFFIC: HouseTraffic = { saved: 0, routed: 0, visited: 0 };

/** One device may send at most ±1 per house per kind in a batch. */
export const TRAFFIC_DELTA_MAX = 1;

export function clampTraffic(value: HouseTraffic): HouseTraffic {
  return {
    saved: Math.max(0, Math.floor(value.saved) || 0),
    routed: Math.max(0, Math.floor(value.routed) || 0),
    visited: Math.max(0, Math.floor(value.visited) || 0),
  };
}

export function overlayTraffic(base: HouseTraffic, pending?: HouseTraffic | null): HouseTraffic {
  if (!pending) return base;
  return clampTraffic({
    saved: base.saved + pending.saved,
    routed: base.routed + pending.routed,
    visited: base.visited + pending.visited,
  });
}

export function clampTrafficDelta(delta: number): number {
  if (!Number.isFinite(delta)) return 0;
  const n = Math.trunc(delta);
  if (!n) return 0;
  return Math.max(-TRAFFIC_DELTA_MAX, Math.min(TRAFFIC_DELTA_MAX, n));
}

export function pendingToEvents(pending: Record<string, HouseTraffic>): TrafficDelta[] {
  const events: TrafficDelta[] = [];
  for (const [houseId, row] of Object.entries(pending)) {
    if (!houseId) continue;
    for (const kind of TRAFFIC_KINDS) {
      const delta = clampTrafficDelta(row[kind]);
      if (!delta) continue;
      events.push({ houseId, kind, delta });
    }
  }
  return events;
}

export function emptyTrafficFile(): TrafficFile {
  return { updatedAt: new Date(0).toISOString(), houses: {} };
}

export function sumTrafficMarks(houses: Record<string, HouseTraffic>): {
  saved: number;
  visited: number;
} {
  let saved = 0;
  let visited = 0;
  for (const row of Object.values(houses)) {
    saved += row.saved ?? 0;
    visited += row.visited ?? 0;
  }
  return { saved, visited };
}
