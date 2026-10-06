import type { House } from "@/lib/types";

/** Fields that always follow the incoming row (even when empty). */
const INCOMING_WINS = new Set<keyof House | string>(["id", "updatedAt", "storeId"]);

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && !value.trim()) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as object).length === 0;
  }
  return false;
}

function hasStoredValue(value: unknown): boolean {
  return !isEmptyValue(value);
}

/**
 * When a redacted or partial catalog row is persisted, do not overwrite Firestore
 * fields that already hold data with empty / null / missing incoming values.
 */
export function preserveStoredHouseFields(incoming: House, existing?: House | null): House {
  if (!existing) return incoming;
  let out: House | null = null;
  const keys = new Set([
    ...Object.keys(existing),
    ...Object.keys(incoming),
  ] as (keyof House)[]);

  for (const key of keys) {
    if (INCOMING_WINS.has(key)) continue;
    const inc = incoming[key];
    const ex = existing[key];
    if (isEmptyValue(inc) && hasStoredValue(ex) && inc !== ex) {
      if (!out) out = { ...incoming };
      (out as Record<keyof House, House[keyof House]>)[key] = ex as House[keyof House];
    }
  }
  return out ?? incoming;
}

/** @deprecated Use preserveStoredHouseFields */
export function preserveStoredAddressFields(incoming: House, existing?: House | null): House {
  return preserveStoredHouseFields(incoming, existing);
}

/** Batch writes: read existing doc when incoming may be a redacted partial row. */
export function houseNeedsExistingMerge(house: House): boolean {
  const keys = Object.keys(house) as (keyof House)[];
  for (const key of keys) {
    if (INCOMING_WINS.has(key)) continue;
    if (isEmptyValue(house[key])) return true;
  }
  return false;
}
