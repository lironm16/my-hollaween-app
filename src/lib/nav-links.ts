import { formatDisplayAddress, formatMapsAddress } from "@/lib/config";
import { houseShareSlug } from "@/lib/ids";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

/** Strip invisible bidi marks that break iOS link detection when copying share text. */
function stripBidiMarks(text: string) {
  return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
}

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
export function houseSharePayload(house: PublicHouse, origin?: string) {
  const url = houseShareUrl(house, origin);
  const title = stripBidiMarks(houseHeadline(house));
  const address = stripBidiMarks(formatDisplayAddress(house));
  const text = address ? `${title}\n${address}` : title;
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
  const { title, text, url } = houseSharePayload(house);
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
