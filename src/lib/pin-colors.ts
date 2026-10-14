import { effectiveHouseKind } from "@/lib/house-kind";
import type { PublicHouse } from "@/lib/types";

export const PIN_INTERIOR = "#fff7ed";

/** Former decorated pin disc fills — now the ghost / pumpkin glyph colors on white discs. */
export const PIN_GHOST_PURPLE = "#6d28d9";
export const PIN_PUMPKIN_ORANGE = "#f97316";
export const PIN_UNDECORATED_GLYPH = "#94a3b8";

/** White disc; glyph color from {@link PIN_GHOST_PURPLE} / {@link PIN_PUMPKIN_ORANGE}. */
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
