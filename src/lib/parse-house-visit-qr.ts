import { HOUSE_VISIT_QUERY, parseVisitFromSearchParams } from "@/lib/house-visit-qr";

/** Decode door QR text into a house id when it is a visit link (`/?focus=…&visit=1`). */
export function parseHouseVisitQrPayload(raw: string, origin = "https://hallowhood.local"): { focusId: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = trimmed.startsWith("/") ? new URL(trimmed, origin) : new URL(trimmed);
  } catch {
    return null;
  }

  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/") return null;

  const focusId = url.searchParams.get("focus")?.trim();
  if (!focusId || !parseVisitFromSearchParams(url.searchParams)) return null;

  return { focusId };
}

export function houseVisitPathFromQrPayload(raw: string, origin?: string): string | null {
  const parsed = parseHouseVisitQrPayload(raw, origin ?? "https://hallowhood.local");
  if (!parsed) return null;
  const params = new URLSearchParams({ focus: parsed.focusId, [HOUSE_VISIT_QUERY]: "1" });
  return `/?${params.toString()}`;
}
