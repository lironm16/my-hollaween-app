import type { PublicHouse } from "@/lib/types";

const TOUR_VISITED = "#059669";
const TOUR_SKIPPED = "#64748b";
const TOUR_OPEN_ROUTE = "#f97316";
const TOUR_OPEN_IDLE = "#fff7ed";
/** Every unit visited or skipped, with both outcomes present — finished mixed cluster. */
export const TOUR_CLUSTER_MIXED = "#e08543";

export function clusterIsFinishedVisitSkipMix(counts: ClusterProgressCounts): boolean {
  return counts.open === 0 && counts.visited > 0 && counts.skipped > 0;
}

export function clusterTourMixedRingGradient(): string {
  return `conic-gradient(from -90deg, ${TOUR_CLUSTER_MIXED} 0% 100%)`;
}

export type ClusterRouteStopBadgeProgress = "open" | "visited" | "skipped" | "mixed";

export type ClusterProgressCounts = {
  visited: number;
  skipped: number;
  open: number;
};

/** Classify cluster houses for aggregate tour ring (not one slice per unit). */
/** Multi-unit cluster with some (not all) houses skipped — hide per-dot skip badges. */
export function clusterHasPartialSkip(
  houses: PublicHouse[],
  skippedIds: readonly string[],
): boolean {
  if (houses.length <= 1) return false;
  const counts = clusterProgressCounts(houses, [], skippedIds);
  return counts.skipped > 0 && counts.skipped < houses.length;
}

export function clusterProgressCounts(
  houses: PublicHouse[],
  visitedIds: readonly string[],
  skippedIds: readonly string[],
): ClusterProgressCounts {
  const visited = new Set(visitedIds);
  const skipped = new Set(skippedIds);
  let visitedN = 0;
  let skippedN = 0;
  let openN = 0;
  for (const house of houses) {
    if (visited.has(house.id)) visitedN += 1;
    else if (skipped.has(house.id)) skippedN += 1;
    else openN += 1;
  }
  return { visited: visitedN, skipped: skippedN, open: openN };
}

/** Route stop badge on multi-unit cluster pins — matches {@link clusterTourRingGradient} completion rules. */
export function clusterRouteStopBadgeProgress(
  houses: PublicHouse[],
  visitedIds: readonly string[],
  skippedIds: readonly string[],
): ClusterRouteStopBadgeProgress {
  if (houses.length === 0) return "open";
  const counts = clusterProgressCounts(houses, visitedIds, skippedIds);
  if (counts.open > 0) return "open";
  if (counts.visited === houses.length) return "visited";
  if (counts.skipped === houses.length) return "skipped";
  if (houses.length > 1 && clusterIsFinishedVisitSkipMix(counts)) return "mixed";
  return "open";
}

/**
 * Cluster tour ring — green / gray / brown mix / white-or-orange:
 * - Any open unit → white (idle) or orange (route mode).
 * - All visited → green; all skipped → gray.
 * - All handled with both visits and skips → amber mix (#e08543).
 */
export function clusterTourRingGradient(
  houses: PublicHouse[],
  visitedIds: readonly string[],
  skippedIds: readonly string[],
  routeModeActive: boolean,
): string | null {
  if (houses.length === 0) return null;
  const counts = clusterProgressCounts(houses, visitedIds, skippedIds);

  if (counts.open > 0) {
    if (counts.open === houses.length && !routeModeActive) return null;
    const openColor = routeModeActive ? TOUR_OPEN_ROUTE : TOUR_OPEN_IDLE;
    return `conic-gradient(from -90deg, ${openColor} 0% 100%)`;
  }

  if (counts.visited === houses.length) {
    return `conic-gradient(from -90deg, ${TOUR_VISITED} 0% 100%)`;
  }
  if (counts.skipped === houses.length) {
    return `conic-gradient(from -90deg, ${TOUR_SKIPPED} 0% 100%)`;
  }
  if (houses.length > 1 && clusterIsFinishedVisitSkipMix(counts)) {
    return clusterTourMixedRingGradient();
  }

  return null;
}

export type ClusterTourRingDecor = {
  classSuffix: string;
  styleAttr: string;
};

/** Full-circle tour rings only — Safari desktop mis-renders masked conic ::before. */
export function solidTourRingColor(gradient: string): string | null {
  const match = gradient.match(
    /^conic-gradient\(from -90deg, (#(?:[0-9a-f]{3,8})|#[0-9a-f]{8}) 0% 100%\)$/i,
  );
  return match?.[1] ?? null;
}

/** HTML class + inline style for tour progress ring on any map pin (border, not fill). */
export function pinTourRingDecor(
  houses: PublicHouse[],
  visitedIds: readonly string[],
  skippedIds: readonly string[],
  routeModeActive: boolean,
): ClusterTourRingDecor {
  return clusterTourRingDecor(houses, visitedIds, skippedIds, routeModeActive);
}

/** @deprecated Use {@link pinTourRingDecor} */
export function clusterTourRingDecor(
  houses: PublicHouse[],
  visitedIds: readonly string[],
  skippedIds: readonly string[],
  routeModeActive: boolean,
): ClusterTourRingDecor {
  const gradient = clusterTourRingGradient(houses, visitedIds, skippedIds, routeModeActive);
  if (gradient) {
    const solid = solidTourRingColor(gradient);
    if (solid) {
      return {
        classSuffix: " pin-tour-ring pin-tour-ring-solid",
        styleAttr: ` style="--pin-tour-ring-color:${solid}"`,
      };
    }
    return {
      classSuffix: " pin-tour-ring",
      styleAttr: ` style="--pin-tour-ring:${gradient}"`,
    };
  }
  return { classSuffix: "", styleAttr: "" };
}
