export const ENGAGEMENT_KINDS = ["like", "visit"] as const;
export type EngagementKind = (typeof ENGAGEMENT_KINDS)[number];

export type EngagementEvent = {
  houseId: string;
  kind: EngagementKind;
  delta: number;
};

export type HouseEngagementCounts = {
  likeCount: number;
  visitCount: number;
};

export const ENGAGEMENT_DELTA_MAX = 1;

export function clampEngagementDelta(delta: number): number {
  if (!Number.isFinite(delta)) return 0;
  const n = Math.trunc(delta);
  if (!n) return 0;
  return Math.max(-ENGAGEMENT_DELTA_MAX, Math.min(ENGAGEMENT_DELTA_MAX, n));
}

export function normalizeEngagementCounts(value: Partial<HouseEngagementCounts> | null | undefined): HouseEngagementCounts {
  return {
    likeCount: Math.max(0, Math.floor(value?.likeCount ?? 0) || 0),
    visitCount: Math.max(0, Math.floor(value?.visitCount ?? 0) || 0),
  };
}

export function aggregateEngagementEvents(events: EngagementEvent[]): Map<string, { like: number; visit: number }> {
  const totals = new Map<string, { like: number; visit: number }>();
  for (const event of events) {
    const houseId = event.houseId?.trim();
    if (!houseId) continue;
    const delta = clampEngagementDelta(event.delta);
    if (!delta) continue;
    const row = totals.get(houseId) ?? { like: 0, visit: 0 };
    if (event.kind === "like") row.like += delta;
    else if (event.kind === "visit") row.visit += delta;
    totals.set(houseId, row);
  }
  return totals;
}

export function applyEngagementDelta(
  base: HouseEngagementCounts,
  delta: { like: number; visit: number },
): HouseEngagementCounts {
  return normalizeEngagementCounts({
    likeCount: base.likeCount + delta.like,
    visitCount: base.visitCount + delta.visit,
  });
}
