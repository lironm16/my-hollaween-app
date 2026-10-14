import { effectiveHouseKind } from "@/lib/house-kind";
import type { PublicHouse } from "@/lib/types";

export const PIN_INTERIOR = "#fff7ed";

/** White disc; ghost/pumpkin color comes from the PNG art (and light tints). */
export const PIN_BACKGROUND = {
  house: {
    decorated: PIN_INTERIOR,
    undecorated: PIN_INTERIOR,
  },
  poi: {
    decorated: PIN_INTERIOR,
    undecorated: PIN_INTERIOR,
  },
} as const;

export function pinBackgroundFill(
  house: Pick<PublicHouse, "kind">,
  decorated: boolean,
): string {
  const palette = PIN_BACKGROUND[effectiveHouseKind(house)];
  return palette[decorated ? "decorated" : "undecorated"];
}
