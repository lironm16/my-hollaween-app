import { effectiveHouseKind } from "@/lib/house-kind";
import type { PublicHouse } from "@/lib/types";

/** Pin circle fills — kept away from candy/scare greens, ambers, and reds. */
export const PIN_BACKGROUND = {
  house: {
    decorated: "#6d28d9",
    undecorated: "#94a3b8",
  },
  poi: {
    /** Cyan-teal — distinct from house purple and status badge colors. */
    decorated: "#0e7490",
    undecorated: "#64748b",
  },
} as const;

export function pinBackgroundFill(
  house: Pick<PublicHouse, "kind">,
  decorated: boolean,
): string {
  const palette = PIN_BACKGROUND[effectiveHouseKind(house)];
  return palette[decorated ? "decorated" : "undecorated"];
}
