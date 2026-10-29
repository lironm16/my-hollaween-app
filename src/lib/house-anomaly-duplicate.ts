import { parseArrivalFloor } from "@/lib/arrival-floor";
import type { House } from "@/lib/types";

/** Loose text normalize for comparing names, arrival, submitter. */
export function normalizeDuplicateCompareText(raw: string): string {
  return raw
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hebrewTokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length > 2 && b.length > 2) {
    if (a.startsWith("ה") && a.slice(1) === b) return true;
    if (b.startsWith("ה") && b.slice(1) === a) return true;
  }
  return false;
}

function tokenOverlapRatio(a: string, b: string): number {
  const ta = normalizeDuplicateCompareText(a).split(" ").filter(Boolean);
  const tb = normalizeDuplicateCompareText(b).split(" ").filter(Boolean);
  if (ta.length === 0 || tb.length === 0) return 0;
  let inter = 0;
  for (const left of ta) {
    if (tb.some((right) => hebrewTokensMatch(left, right))) inter += 1;
  }
  return inter / Math.min(ta.length, tb.length);
}

/** Similar wording — not only character-for-character equality. */
export function duplicateCompareTextsSimilar(a: string, b: string): boolean {
  const na = normalizeDuplicateCompareText(a);
  const nb = normalizeDuplicateCompareText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const minLen = 4;
  if (na.length >= minLen && nb.length >= minLen && (na.includes(nb) || nb.includes(na))) {
    return true;
  }
  return tokenOverlapRatio(a, b) >= 0.75;
}

export function parseArrivalApartmentNumber(text: string): number | null {
  const raw = text.trim();
  if (!raw) return null;
  const candidates: number[] = [];
  for (const match of raw.matchAll(/דירה\s*[:\-]?\s*(\d{1,3})/giu)) {
    const n = Number(match[1]);
    if (Number.isFinite(n)) candidates.push(n);
  }
  for (const match of raw.matchAll(/\b(?:apt|apartment)\.?\s*(\d{1,3})\b/gi)) {
    const n = Number(match[1]);
    if (Number.isFinite(n)) candidates.push(n);
  }
  if (candidates.length === 0) return null;
  return candidates[0]!;
}

function sameSubmitter(a: House, b: House): boolean {
  const aa = normalizeDuplicateCompareText(a.addedBy ?? "");
  const bb = normalizeDuplicateCompareText(b.addedBy ?? "");
  return aa.length >= 2 && aa === bb;
}

function sameApartmentLocation(a: House, b: House): boolean {
  const aptA = parseArrivalApartmentNumber(a.arrival ?? "");
  const aptB = parseArrivalApartmentNumber(b.arrival ?? "");
  if (aptA === null || aptB === null || aptA !== aptB) return false;
  const floorA = parseArrivalFloor(a.arrival ?? "");
  const floorB = parseArrivalFloor(b.arrival ?? "");
  if (floorA !== null && floorB !== null && floorA !== floorB) return false;
  return true;
}

/** Two houses at the same pin may be duplicate registrations. */
export function housesSuspectDuplicateApartment(a: House, b: House): boolean {
  if (a.id === b.id) return false;

  const nameSimilar = duplicateCompareTextsSimilar(a.name, b.name);
  const arrivalSimilar = duplicateCompareTextsSimilar(a.arrival ?? "", b.arrival ?? "");
  const submitterSame = sameSubmitter(a, b);

  if (sameApartmentLocation(a, b)) return true;
  if (submitterSame && (nameSimilar || arrivalSimilar)) return true;
  if (nameSimilar && arrivalSimilar) return true;
  if (arrivalSimilar && normalizeDuplicateCompareText(a.arrival ?? "").length >= 8) return true;

  return false;
}

export function formatDuplicateApartmentPairDetail(a: House, b: House): string {
  const left = a.name.trim() || a.id;
  const right = b.name.trim() || b.id;
  const bits = [`${left} ↔ ${right}`];
  const arrivalA = a.arrival?.trim();
  const arrivalB = b.arrival?.trim();
  if (arrivalA || arrivalB) {
    bits.push([arrivalA, arrivalB].filter(Boolean).join(" / "));
  }
  const byA = a.addedBy?.trim();
  const byB = b.addedBy?.trim();
  if (byA && byB && normalizeDuplicateCompareText(byA) === normalizeDuplicateCompareText(byB)) {
    bits.push(`נוסף ע״י ${byA}`);
  }
  return bits.join(" · ");
}
