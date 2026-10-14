import { effectiveHouseKind } from "@/lib/house-kind";
import type { PublicHouse } from "@/lib/types";

/** Pin circle fills — ghost purple / pumpkin orange; PNG faces keep black details. */
export const PIN_BACKGROUND = {
  house: {
    decorated: "#6d28d9",
    undecorated: "#94a3b8",
  },
  poi: {
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
