import { effectiveHouseKind } from "@/lib/house-kind";
import type { PublicHouse } from "@/lib/types";

/** Pin circle fills — kept away from candy/scare greens, ambers, and reds. */
export const PIN_BACKGROUND = {
  house: {
    decorated: "#6d28d9",
    undecorated: "#94a3b8",
  },
  poi: {
    /** Vivid orange — pops against house purple; warmer/brighter than candy-low amber. */
    decorated: "#f97316",
    undecorated: "#78716c",
  },
} as const;

export function pinBackgroundFill(
  house: Pick<PublicHouse, "kind">,
  decorated: boolean,
): string {
  const palette = PIN_BACKGROUND[effectiveHouseKind(house)];
  return palette[decorated ? "decorated" : "undecorated"];
}
