import { streetFromLegacyAddress } from "@/lib/address-fields";
import {
  localizedClusterOverviewSubtitle,
  localizedClusterPinAriaLabel,
} from "@/lib/i18n/cluster-copy";
import type { AppLocale } from "@/lib/i18n/locale";
import type { NeighborhoodId } from "@/lib/config";
import type { PublicHouse } from "@/lib/types";

/** Legacy hook — campus hood no longer comes from a manual list. */
export function schoolCampusNeighborhoodForAddress(
  _address: string | null | undefined,
): NeighborhoodId | null {
  return null;
}

/** Stored address looks like a school name (no manual coordinate list). */
export function isSchoolCampusAddress(address: string | null | undefined): boolean {
  const street = streetFromLegacyAddress(address?.trim() ?? "");
  if (!street) return false;
  return /^ביה״ס|^בי["״]ס|^בית\s+ספר/iu.test(street);
}

/** Cluster sheet / list chrome — school campuses always use campus UI (even one booth). */
export function usesSchoolCampusClusterChrome(
  houses: readonly Pick<PublicHouse, "address">[],
): boolean {
  return clusterIsSchoolCampus(houses);
}

/** Map pin / copy — one or more rows at the same school-style address. */
export function clusterIsSchoolCampus(houses: readonly Pick<PublicHouse, "address">[]): boolean {
  if (houses.length === 0) return false;
  if (houses.length === 1) return isSchoolCampusAddress(houses[0]?.address);
  return houses.every((house) => isSchoolCampusAddress(house.address));
}

/** Cluster sheet subtitle under the address line. */
export function clusterOverviewSubtitle(
  houses: readonly Pick<PublicHouse, "address">[],
  locale: AppLocale = "he",
): string {
  return localizedClusterOverviewSubtitle(locale, houses);
}

/** Map pan / cluster anchor — house coordinates only. */
export function mapCoordsForHouse(
  house: Pick<PublicHouse, "address" | "lat" | "lng">,
): { lat: number; lng: number } {
  return { lat: house.lat, lng: house.lng };
}

/** Bulk visit/skip dialog — school name or building street only (not first booth title). */
export function clusterBulkActionSubtitle(
  houses: readonly Pick<PublicHouse, "address">[],
): string {
  const first = houses[0];
  if (!first) return "";
  const street = streetFromLegacyAddress(first.address?.trim() ?? "").trim();
  return street || first.address?.trim() || "";
}

export function clusterPinAriaLabel(
  houses: readonly Pick<PublicHouse, "address">[],
  locale: AppLocale = "he",
): string {
  return localizedClusterPinAriaLabel(locale, houses);
}
