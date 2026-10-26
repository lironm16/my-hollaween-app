import type { DwellingKind, House, HouseInput } from "@/lib/types";
import { DWELLING_KINDS } from "@/lib/types";
import { isPoiHouse } from "@/lib/house-kind";

export { DWELLING_KINDS };

export const DWELLING_KIND_LABELS: Record<DwellingKind, string> = {
  private: "בית פרטי",
  apartment: "דירה בבניין",
};

export function normalizeDwellingKind(value: unknown): DwellingKind {
  return value === "apartment" ? "apartment" : "private";
}

export function houseNeedsArrivalInstructions(house: Pick<House, "kind" | "dwellingKind">): boolean {
  if (isPoiHouse(house)) return false;
  return normalizeDwellingKind(house.dwellingKind) === "apartment";
}

export function defaultDwellingKindForInput(input?: Partial<HouseInput>): DwellingKind {
  return normalizeDwellingKind(input?.dwellingKind);
}
