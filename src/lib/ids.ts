import { customAlphabet } from "nanoid";

const digits = customAlphabet("0123456789", 4);
const pin = customAlphabet("0123456789", 6);

const HOUSE_ID_PREFIX = "בית-";
const POI_ID_PREFIX = "נק-";

export function newPublicId() {
  return `${HOUSE_ID_PREFIX}${digits()}`;
}

export function newPoiPublicId() {
  return `${POI_ID_PREFIX}${digits()}`;
}

export function newEditCode() {
  return pin();
}

/** Path params for `בית-1234` sometimes arrive still percent-encoded. */
export function canonicalHouseId(raw: string): string {
  let id = String(raw ?? "").trim();
  for (let i = 0; i < 3; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(id)) break;
    try {
      const next = decodeURIComponent(id);
      if (next === id) break;
      id = next;
    } catch {
      break;
    }
  }
  try {
    return id.normalize("NFC");
  } catch {
    return id;
  }
}

export function sameHouseId(a: string, b: string) {
  return canonicalHouseId(a) === canonicalHouseId(b);
}

/** ASCII slug for share links — `בית-4948` → `4948`. */
export function houseShareSlug(rawId: string): string {
  const id = canonicalHouseId(rawId);
  const match = id.match(/^(?:בית|נק)-(\d{4,6})$/);
  if (match) return match[1];
  return encodeURIComponent(id);
}

/** Resolve `/house/[id]` param to the canonical catalog id. */
export function resolveHouseIdFromPath(raw: string): string {
  const segment = canonicalHouseId(raw);
  if (/^\d{4,6}$/.test(segment)) return `${HOUSE_ID_PREFIX}${segment}`;
  if (/^נק-\d{4,6}$/.test(segment)) return segment;
  if (/^בית-\d{4,6}$/.test(segment)) return segment;
  return segment;
}

export function toPublicHouse<T extends { editCode?: string; storeId?: string }>(house: T) {
  const rest = { ...house };
  delete rest.editCode;
  delete rest.storeId;
  return rest as Omit<T, "editCode" | "storeId">;
}
