import { parseStreetAndNumber } from "@/lib/address-text";
import type { NeighborhoodId } from "@/lib/config";

/** Known street+number → hood corrections (display, backfill, filters). */
const STREET_NEIGHBORHOOD_OVERRIDES: Record<string, NeighborhoodId> = {
  "רוקח 32": "שיכון ותיקים",
  "רוקח 34": "שיכון ותיקים",
};

/** Normalize to `רחוב מספר` for override lookup. */
export function streetAddressLookupKey(address: string): string {
  const head = address.trim().split(",")[0]?.trim() ?? "";
  const parsed = parseStreetAndNumber(head);
  const road = parsed.road.trim();
  const num = parsed.num?.trim();
  if (road && num) return `${road} ${num}`;
  return head;
}

export function neighborhoodOverrideForStreetAddress(address: string): NeighborhoodId | null {
  const key = streetAddressLookupKey(address);
  return STREET_NEIGHBORHOOD_OVERRIDES[key] ?? null;
}
