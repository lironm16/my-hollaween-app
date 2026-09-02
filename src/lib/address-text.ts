const HOUSE_NUM = String.raw`(\d+[א-תA-Za-z]?(?:[/-]\d+)?)`;

function stripCity(query: string) {
  return query
    .replace(/,?\s*רמת\s*גן\s*$/u, "")
    .replace(/,?\s*ישראל\s*$/u, "")
    .trim();
}

/** Hebrew typing is usually "נחליאלי 4"; Nominatim prefers "4 נחליאלי". */
export function parseStreetAndNumber(query: string): { road: string; num?: string } {
  const q = stripCity(query.split(",")[0] ?? query);
  const end = q.match(new RegExp(`^(.+?)\\s+${HOUSE_NUM}$`, "u"));
  if (end && end[1].replace(/\d/g, "").trim().length >= 2) {
    return { road: end[1].trim(), num: end[2] };
  }
  const start = q.match(new RegExp(`^${HOUSE_NUM}\\s+(.+)$`, "u"));
  if (start && start[2].replace(/\d/g, "").trim().length >= 2) {
    return { road: start[2].trim(), num: start[1] };
  }
  return { road: q };
}

export function houseNumberFromHit(
  hit: { houseNumber?: string; label: string },
  query = "",
): string | undefined {
  const own = hit.houseNumber?.trim();
  if (own) return own;
  return parseStreetAndNumber(hit.label).num || parseStreetAndNumber(query).num;
}

export function streetPinHint(hit: { precise: boolean; houseNumber?: string; label: string }) {
  if (hit.precise) return null;
  const num = houseNumberFromHit(hit);
  if (num) return `סימנו את הרחוב. גררו את הסיכה עד לבית מספר ${num}`;
  return "רחוב בלי מספר — גררו את הסיכה לבית";
}
