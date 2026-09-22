import { formatDisplayAddress, formatMapsAddress } from "@/lib/config";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

export function houseMapsUrl(house: PublicHouse) {
  const query = formatMapsAddress(house).trim();
  if (query) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}&travelmode=walking`;
  }
  if (Number.isFinite(house.lat) && Number.isFinite(house.lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${house.lat},${house.lng}&travelmode=walking`;
  }
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking`;
}

export function houseSharePath(house: PublicHouse) {
  return `/house/${encodeURIComponent(house.id)}`;
}

export function houseShareUrl(house: PublicHouse, origin?: string) {
  const path = houseSharePath(house);
  if (origin) return `${origin.replace(/\/$/, "")}${path}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

/** Web Share payload — full URL in `text` so iOS “Copy” gets the link, not just the slug. */
export function houseSharePayload(house: PublicHouse, origin?: string) {
  const url = houseShareUrl(house, origin);
  const title = houseHeadline(house);
  const address = formatDisplayAddress(house);
  const text = address ? `${title}\n${address}\n${url}` : `${title}\n${url}`;
  return { title, text, url };
}

export function editCodeSharePayload(house: PublicHouse, editCode: string) {
  const title = `קוד עריכה — ${houseHeadline(house)}`;
  const text = `קוד העריכה ל${houseHeadline(house)}: ${editCode}\n\nלהזנה: תפריט → בית → עריכה → בחרו את הבית → הזינו את הקוד.`;
  return { title, text };
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
): Promise<"shared" | "copied" | "aborted" | "failed"> {
  const { title, text } = houseSharePayload(house);
  try {
    if (navigator.share) {
      // Omit `url` — iOS “Copy” duplicates it as a large rich link when text already has the URL.
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
