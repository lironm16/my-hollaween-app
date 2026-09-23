import { effectiveHouseKind } from "@/lib/house-kind";
import type { PublicHouse, ScareLevel } from "@/lib/types";

const HOUSE_SCARE_SRC: Record<ScareLevel, string> = {
  mild: "/icons/pin-scare-mild.png",
  medium: "/icons/pin-scare-medium.png",
  spicy: "/icons/pin-scare-spicy.png",
};

const POI_SCARE_SRC: Record<ScareLevel, string> = {
  mild: "/icons/pin-poi-mild.png",
  medium: "/icons/pin-poi-medium.png",
  spicy: "/icons/pin-poi-spicy.png",
};

export function pinScareSrc(house: Pick<PublicHouse, "kind" | "scareLevel">, level?: ScareLevel) {
  const scare = level ?? house.scareLevel ?? "mild";
  return effectiveHouseKind(house) === "poi" ? POI_SCARE_SRC[scare] : HOUSE_SCARE_SRC[scare];
}
