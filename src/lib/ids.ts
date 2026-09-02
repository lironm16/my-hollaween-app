import { customAlphabet } from "nanoid";

const digits = customAlphabet("0123456789", 4);
const pin = customAlphabet("0123456789", 6);

export function newPublicId() {
  return `בית-${digits()}`;
}

export function newEditCode() {
  return pin();
}

export function toPublicHouse<T extends { editCode?: string; rejectionReason?: string }>(
  house: T,
) {
  const rest = { ...house };
  delete rest.editCode;
  delete rest.rejectionReason;
  return rest as Omit<T, "editCode" | "rejectionReason">;
}
