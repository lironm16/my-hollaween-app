import { formatDisplayAddress } from "@/lib/config";
import { visitLabels } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

export function houseSelectionAnnouncement(house: PublicHouse): string {
  const address = formatDisplayAddress(house);
  const visit = visitLabels[house.visit] ?? house.visit;
  return `נבחר: ${house.name}, ${address}. ${visit}`;
}
