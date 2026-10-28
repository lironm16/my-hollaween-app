/** Parsed floor index: 0 = ground (קרקע), 1 = first floor, etc. */
export function parseArrivalFloor(text: string): number | null {
  const raw = text.trim();
  if (!raw) return null;

  const candidates: number[] = [];

  if (/(?:^|[\s,])קרקע(?:[\s,]|$)/u.test(raw) || /\bground\s*floor\b/i.test(raw)) {
    candidates.push(0);
  }

  for (const match of raw.matchAll(/קומה\s*[:\-]?\s*(\d{1,2})/giu)) {
    const n = Number(match[1]);
    if (Number.isFinite(n)) candidates.push(n);
  }

  for (const match of raw.matchAll(/(\d{1,2})\s*(?:st|nd|rd|th)\s*floor/gi)) {
    const n = Number(match[1]);
    if (Number.isFinite(n)) candidates.push(n);
  }

  for (const match of raw.matchAll(/\bfloor\s*(\d{1,2})\b/gi)) {
    const n = Number(match[1]);
    if (Number.isFinite(n)) candidates.push(n);
  }

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

/** Event map assumes ground-level trick-or-treat; flag 4th floor and above. */
export const HIGH_FLOOR_ANOMALY_MIN = 4;

export function isHighFloorArrival(text: string): boolean {
  const floor = parseArrivalFloor(text);
  return floor !== null && floor >= HIGH_FLOOR_ANOMALY_MIN;
}
