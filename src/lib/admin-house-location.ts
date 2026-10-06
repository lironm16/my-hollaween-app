import { formatDisplayAddress, resolveNeighborhood, type NeighborhoodId } from "@/lib/config";

/** Admin display uses the same stored hood rules as the public app (no pin inference). */
export function resolveNeighborhoodForAdmin(house: {
  address?: string;
  neighborhood?: NeighborhoodId | null;
  lat?: number;
  lng?: number;
}): NeighborhoodId | null {
  return resolveNeighborhood(house);
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
  return formatDisplayAddress(house);
}
