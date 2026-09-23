import { effectiveHouseKind } from "@/lib/house-kind";
import type { PublicHouse, ScareLevel } from "@/lib/types";

const HOUSE_SCARE_SRC: Record<ScareLevel, string> = {
  mild: "/icons/pin-scare-mild.png",
  medium: "/icons/pin-scare-medium.png",
  spicy: "/icons/pin-scare-spicy.png",
};

/** POI map pins — one jack-o'-lantern silhouette (cream + black face) on orange. */
export const POI_PIN_FACE_SRC = "/icons/pin-poi-medium.png";

export function pinScareSrc(house: Pick<PublicHouse, "kind" | "scareLevel">, level?: ScareLevel) {
  const scare = level ?? house.scareLevel ?? "mild";
  return effectiveHouseKind(house) === "poi" ? POI_PIN_FACE_SRC : HOUSE_SCARE_SRC[scare];
}
