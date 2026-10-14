import type { PublicHouse } from "@/lib/types";

const TOUR_VISITED = "#059669";
const TOUR_SKIPPED = "#64748b";
const TOUR_OPEN = "#fff7ed";

function sliceColor(
  houseId: string,
  visitedIds: ReadonlySet<string>,
  skippedIds: ReadonlySet<string>,
): string {
  if (visitedIds.has(houseId)) return TOUR_VISITED;
  if (skippedIds.has(houseId)) return TOUR_SKIPPED;
  return TOUR_OPEN;
}

/** Conic-fill for building cluster pins — one slice per house (visited / skipped / open). */
export function clusterTourBackgroundStyle(
  houses: PublicHouse[],
  visitedIds: readonly string[],
  skippedIds: readonly string[],
): string | null {
  if (houses.length === 0) return null;
  const visited = new Set(visitedIds);
  const skipped = new Set(skippedIds);
  const colors = houses.map((house) => sliceColor(house.id, visited, skipped));
  if (colors.every((color) => color === TOUR_OPEN)) return null;
  if (houses.length === 1) {
    return `background:${colors[0]!} !important`;
  }
  const n = houses.length;
  const stops = colors.map(
    (color, index) => `${color} ${(100 * index) / n}% ${(100 * (index + 1)) / n}%`,
  );
  return `background:conic-gradient(from -90deg, ${stops.join(", ")}) !important`;
}
