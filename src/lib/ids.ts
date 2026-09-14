import { customAlphabet } from "nanoid";

const digits = customAlphabet("0123456789", 4);
const pin = customAlphabet("0123456789", 6);

export function newPublicId() {
  return `בית-${digits()}`;
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

export function toPublicHouse<T extends { editCode?: string; rejectionReason?: string; storeId?: string }>(
  house: T,
) {
  const rest = { ...house };
  delete rest.editCode;
  delete rest.rejectionReason;
  delete rest.storeId;
  return rest as Omit<T, "editCode" | "rejectionReason" | "storeId">;
}
