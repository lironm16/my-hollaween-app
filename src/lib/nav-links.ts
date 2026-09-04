import { formatDisplayAddress } from "@/lib/config";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

function mapsQueryFor(house: PublicHouse) {
  const displayAddress = formatDisplayAddress(house);
  return /רמת\s*גן/u.test(displayAddress) ? displayAddress : `${displayAddress}, רמת גן`;
}

export function houseMapsUrl(house: PublicHouse) {
  if (Number.isFinite(house.lat) && Number.isFinite(house.lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${house.lat},${house.lng}&travelmode=walking`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQueryFor(house))}&travelmode=walking`;
}

export function houseWazeUrl(house: PublicHouse) {
  if (Number.isFinite(house.lat) && Number.isFinite(house.lng)) {
    return `https://waze.com/ul?ll=${house.lat},${house.lng}&navigate=yes`;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(mapsQueryFor(house))}&navigate=yes`;
}

export function houseSharePath(house: PublicHouse) {
  return `/house/${encodeURIComponent(house.id)}`;
}

export function houseShareUrl(house: PublicHouse) {
  if (typeof window === "undefined") return houseSharePath(house);
  return `${window.location.origin}${houseSharePath(house)}`;
}

export async function shareHouse(
  house: PublicHouse,
): Promise<"shared" | "copied" | "aborted" | "failed"> {
  const url = houseShareUrl(house);
  const title = houseHeadline(house);
  const text = formatDisplayAddress(house);
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "aborted";
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
