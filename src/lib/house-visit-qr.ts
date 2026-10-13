import type { PublicHouse } from "@/lib/types";

/** Query flag: opening the map with focus marks the house as visited (QR / shared link). */
export const HOUSE_VISIT_QUERY = "visit";

export function houseVisitQueryValue() {
  return "1";
}

export function houseVisitSearchParams(houseId: string) {
  return {
    focus: houseId,
    [HOUSE_VISIT_QUERY]: houseVisitQueryValue(),
  } as const;
}

/** Canonical URL for door QR — works in browser tab and installed PWA. */
export function houseVisitQrUrl(house: PublicHouse, origin?: string) {
  const params = new URLSearchParams({
    focus: house.id,
    [HOUSE_VISIT_QUERY]: houseVisitQueryValue(),
  });
  const path = `/?${params.toString()}`;
  if (origin) return `${origin.replace(/\/$/, "")}${path}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function parseVisitFromSearchParams(params: URLSearchParams | Readonly<Record<string, string | undefined>>) {
  const raw =
    params instanceof URLSearchParams
      ? params.get(HOUSE_VISIT_QUERY)
      : params[HOUSE_VISIT_QUERY];
  return raw === houseVisitQueryValue() || raw === "true";
}
