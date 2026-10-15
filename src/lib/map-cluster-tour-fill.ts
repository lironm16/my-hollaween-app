import type { PublicHouse } from "@/lib/types";

const TOUR_VISITED = "#059669";
const TOUR_SKIPPED = "#64748b";
const TOUR_OPEN_ROUTE = "#f97316";
const TOUR_OPEN_IDLE = "#fff7ed";

/** Alternating visit/skip stripes — reads as “done with mix” without a third accent color. */
export function clusterTourMixedRingGradient(): string {
  return `repeating-conic-gradient(from -90deg, ${TOUR_VISITED} 0deg 42deg, ${TOUR_SKIPPED} 42deg 84deg)`;
}

export type ClusterRouteStopBadgeProgress = "open" | "visited" | "skipped" | "mixed";

export type ClusterProgressCounts = {
  visited: number;
  skipped: number;
  open: number;
};

/** Classify cluster houses for aggregate tour ring (not one slice per unit). */
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
  const { visited, skipped, open } = clusterProgressCounts(houses, visitedIds, skippedIds);
  if (open > 0) return "open";
  if (visited === houses.length) return "visited";
  if (skipped === houses.length) return "skipped";
  return "mixed";
}

/**
 * Cluster tour ring — green / gray / striped mix / white-or-orange:
 * - Any “open” house (neither visited nor skipped) → solid white (idle) or orange (route mode).
 * - Else all visited → solid green; all skipped → solid gray.
 * - Else visited+skipped only → green/gray stripe ring.
 */
export function clusterTourRingGradient(
  houses: PublicHouse[],
  visitedIds: readonly string[],
  skippedIds: readonly string[],
  routeModeActive: boolean,
): string | null {
  if (houses.length === 0) return null;
  const { visited, skipped, open } = clusterProgressCounts(houses, visitedIds, skippedIds);

  if (open > 0) {
    if (open === houses.length && !routeModeActive) return null;
    const openColor = routeModeActive ? TOUR_OPEN_ROUTE : TOUR_OPEN_IDLE;
    return `conic-gradient(from -90deg, ${openColor} 0% 100%)`;
  }

  if (visited === houses.length) {
    return `conic-gradient(from -90deg, ${TOUR_VISITED} 0% 100%)`;
  }
  if (skipped === houses.length) {
    return `conic-gradient(from -90deg, ${TOUR_SKIPPED} 0% 100%)`;
  }

  if (visited + skipped === 0) return null;
  return clusterTourMixedRingGradient();
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
    const mixedStripes = gradient.startsWith("repeating-conic-gradient");
    return {
      classSuffix: mixedStripes ? " pin-tour-ring pin-tour-ring-mixed" : " pin-tour-ring",
      styleAttr: ` style="--pin-tour-ring:${gradient}"`,
    };
  }
  return { classSuffix: "", styleAttr: "" };
}
