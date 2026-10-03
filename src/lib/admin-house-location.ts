import { type NeighborhoodId } from "@/lib/config";
import { neighborhoodCalculatedLegacy } from "@/lib/neighborhood-backfill";
import { neighborhoodOverrideForStreetAddress } from "@/lib/street-neighborhood-overrides";

/** Admin-only hood label — legacy zone/inference + known street fixes (not public filters). */
export function resolveNeighborhoodForAdmin(house: {
  address?: string;
  neighborhood?: NeighborhoodId | null;
  lat?: number;
  lng?: number;
}): NeighborhoodId | null {
  if (house.address?.trim()) {
    const override = neighborhoodOverrideForStreetAddress(house.address);
    if (override) return override;
  }
  return neighborhoodCalculatedLegacy(house);
}

export function adminLocationLines(house: {
  address: string;
  neighborhood?: NeighborhoodId | null;
  lat?: number;
  lng?: number;
}): { street: string; hood: NeighborhoodId | null } {
  const street = house.address.trim();
  const hood = resolveNeighborhoodForAdmin(house);
  return { street, hood };
}

/** Street + hood on one line (admin cards / share). */
export function formatAdminDisplayAddress(house: {
  address: string;
  neighborhood?: NeighborhoodId | null;
  lat?: number;
  lng?: number;
}): string {
  const { street, hood } = adminLocationLines(house);
  if (!street) return hood ?? "";
  if (!hood) return street;
  return `${street}, ${hood}`;
}
