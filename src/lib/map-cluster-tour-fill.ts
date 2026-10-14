import type { PublicHouse } from "@/lib/types";

const TOUR_VISITED = "#059669";
const TOUR_SKIPPED = "#64748b";
const TOUR_OPEN_ROUTE = "#f97316";
const TOUR_OPEN_IDLE = "#fff7ed";

function sliceColor(
  houseId: string,
  visitedIds: ReadonlySet<string>,
  skippedIds: ReadonlySet<string>,
  routeModeActive: boolean,
): string {
  if (visitedIds.has(houseId)) return TOUR_VISITED;
  if (skippedIds.has(houseId)) return TOUR_SKIPPED;
  return routeModeActive ? TOUR_OPEN_ROUTE : TOUR_OPEN_IDLE;
}

/** Conic gradient for the cluster pin ring — one slice per house on the border. */
export function clusterTourRingGradient(
  houses: PublicHouse[],
  visitedIds: readonly string[],
  skippedIds: readonly string[],
  routeModeActive: boolean,
): string | null {
  if (houses.length === 0) return null;
  const visited = new Set(visitedIds);
  const skipped = new Set(skippedIds);
  const colors = houses.map((house) => sliceColor(house.id, visited, skipped, routeModeActive));
  const hasProgress = colors.some((color) => color === TOUR_VISITED || color === TOUR_SKIPPED);
  const allOpen = colors.every((color) =>
    routeModeActive ? color === TOUR_OPEN_ROUTE : color === TOUR_OPEN_IDLE,
  );

  if (allOpen && !routeModeActive) return null;
  if (allOpen && routeModeActive) {
    return `conic-gradient(from -90deg, ${TOUR_OPEN_ROUTE} 0% 100%)`;
  }
  if (!routeModeActive && !hasProgress) return null;

  if (houses.length === 1) {
    return `conic-gradient(from -90deg, ${colors[0]!} 0% 100%)`;
  }
  const n = houses.length;
  const stops = colors.map(
    (color, index) => `${color} ${(100 * index) / n}% ${(100 * (index + 1)) / n}%`,
  );
  return `conic-gradient(from -90deg, ${stops.join(", ")})`;
}

export type ClusterTourRingDecor = {
  classSuffix: string;
  styleAttr: string;
};

/** HTML class + inline style for building cluster tour ring (border, not fill). */
export function clusterTourRingDecor(
  houses: PublicHouse[],
  visitedIds: readonly string[],
  skippedIds: readonly string[],
  routeModeActive: boolean,
): ClusterTourRingDecor {
  const gradient = clusterTourRingGradient(houses, visitedIds, skippedIds, routeModeActive);
  if (gradient) {
    return {
      classSuffix: " pin-tour-ring",
      styleAttr: ` style="--pin-tour-ring:${gradient}"`,
    };
  }
  if (routeModeActive) {
    return { classSuffix: " is-route-ring", styleAttr: "" };
  }
  return { classSuffix: "", styleAttr: "" };
}
