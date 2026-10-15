import { formatDisplayAddress, formatMapsAddress } from "@/lib/config";
import type { ResolvedOrigin } from "@/lib/distance-origin";
import { isDeviceCachePinHouse } from "@/lib/device-catalog-cache";
import { houseShareSlug } from "@/lib/ids";
import { houseHeadline } from "@/lib/labels";
import { googleMapsNavigateUrl } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";

/** When false, Google Maps should use the device’s live GPS (no origin param). */
export function mapsNavigateUsesExplicitOrigin(origin: ResolvedOrigin) {
  return origin.kind !== "gps" || !origin.fromGps;
}

type HouseMapsDestination =
  | { kind: "address"; query: string }
  | { kind: "coords"; lat: number; lng: number };

function houseMapsDestination(house: PublicHouse): HouseMapsDestination | null {
  const query = formatMapsAddress(house).trim();
  if (query) return { kind: "address", query };
  if (!isDeviceCachePinHouse(house) && Number.isFinite(house.lat) && Number.isFinite(house.lng)) {
    return { kind: "coords", lat: house.lat, lng: house.lng };
  }
  return null;
}

/** Strip invisible bidi marks that break iOS link detection when copying share text. */
function stripBidiMarks(text: string) {
  return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
}

export function houseMapsUrl(house: PublicHouse, options?: { origin?: ResolvedOrigin }) {
  const destination = houseMapsDestination(house);
  const origin = options?.origin;
  const originPoint = origin ? { lat: origin.lat, lng: origin.lng } : null;
  if (originPoint && origin && mapsNavigateUsesExplicitOrigin(origin) && destination) {
    if (destination.kind === "coords") {
      return googleMapsNavigateUrl(originPoint, { lat: destination.lat, lng: destination.lng });
    }
    const params = new URLSearchParams({
      api: "1",
      travelmode: "walking",
      dir_action: "navigate",
      origin: `${originPoint.lat},${originPoint.lng}`,
      destination: destination.query,
    });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }
  if (destination?.kind === "address") {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.query)}&travelmode=walking`;
  }
  if (destination?.kind === "coords") {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=walking`;
  }
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking`;
}

export function houseSharePath(house: PublicHouse) {
  const slug = houseShareSlug(house.id);
  return `/house/${slug}`;
}

export function houseShareUrl(house: PublicHouse, origin?: string) {
  const path = houseSharePath(house);
  if (origin) return `${origin.replace(/\/$/, "")}${path}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

/** Web Share payload — URL in `url` field so iOS Copy gets a clean ASCII link. */
export function houseSharePayload(
  house: PublicHouse,
  origin?: string,
  options?: { includeLocationDetails?: boolean; displayAddress?: string },
) {
  const url = houseShareUrl(house, origin);
  const title = stripBidiMarks(houseHeadline(house));
  const includeLocation = options?.includeLocationDetails !== false;
  const address = includeLocation
    ? stripBidiMarks(options?.displayAddress ?? formatDisplayAddress(house))
    : "";
  const text = address ? `${title}\n${address}` : title;
  return { title, text, url };
}

export function editCodeSharePayload(house: PublicHouse, editCode: string) {
  const title = `קוד משפחה — ${houseHeadline(house)}`;
  const text = `קוד המשפחה ל${houseHeadline(house)}: ${editCode}\n\nלהתחברות: תפריט ← התחברות ← הזינו את הקוד.`;
  return { title, text };
}

export async function shareHouseAccessInvite(
  house: PublicHouse,
  origin?: string,
): Promise<"shared" | "copied" | "aborted" | "failed"> {
  try {
    const res = await fetch(`/api/houses/${encodeURIComponent(house.id)}/invites`, {
      method: "POST",
    });
    const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!res.ok || !json?.url) return "failed";
    const url =
      json.url.startsWith("http") ? json.url : `${(origin ?? window.location.origin).replace(/\/$/, "")}${json.url}`;
    const title = `הזמנה — ${houseHeadline(house)}`;
    const text = `הצטרפו לבית שלנו במפת השכונה:\n${url}`;
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
    await navigator.clipboard.writeText(`${text}`);
    return "copied";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "aborted";
    return "failed";
  }
}

export async function shareEditCode(
  house: PublicHouse,
  editCode: string,
): Promise<"shared" | "copied" | "aborted" | "failed"> {
  const { title, text } = editCodeSharePayload(house, editCode);
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "aborted";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

export async function shareHouse(
  house: PublicHouse,
  options?: Parameters<typeof houseSharePayload>[2],
): Promise<"shared" | "copied" | "aborted" | "failed"> {
  const { title, text, url } = houseSharePayload(house, undefined, options);
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
