import { houseUpdatedMs } from "@/lib/house-updated-at";
import type { EditorHouse, House, PublicHouse } from "@/lib/types";

function pickTextField(
  houseValue: string | undefined,
  adminValue: string | undefined,
  houseUpdatedAt: string | undefined,
  adminUpdatedAt: string | undefined,
): string {
  const houseText = houseValue?.trim() ?? "";
  const adminText = adminValue?.trim() ?? "";
  if (!adminText) return houseText;
  if (!houseText) return adminText;
  return houseUpdatedMs(adminUpdatedAt) > houseUpdatedMs(houseUpdatedAt) ? adminText : houseText;
}

/** Overlay catalog/redacted rows with the admin API snapshot (street, arrival, contact). */
/** Street / arrival / notes only — for «תצוגת משתמש» after simulated reveal (no owner contact). */
export function mergePublicHouseLocationFromAdminRow(
  house: PublicHouse,
  admin?: House | null,
): PublicHouse {
  if (!admin) return house;
  const address = house.address?.trim() ? house.address : (admin.address ?? "");
  const arrival = house.arrival?.trim() ? house.arrival : (admin.arrival ?? "");
  const notes = house.notes?.trim() ? house.notes : admin.notes;
  if (address === house.address && arrival === house.arrival && notes === house.notes) return house;
  return { ...house, address, arrival, notes };
}

export function mergePublicHouseWithAdminRow(
  house: PublicHouse,
  admin?: House | null,
): EditorHouse {
  if (!admin) return house as EditorHouse;
  const editor = house as EditorHouse;
  const address = house.address?.trim() ? house.address : (admin.address ?? "");
  const arrival = house.arrival?.trim() ? house.arrival : (admin.arrival ?? "");
  const notes = pickTextField(house.notes, admin.notes, house.updatedAt, admin.updatedAt);
  const description = pickTextField(
    house.description,
    admin.description,
    house.updatedAt,
    admin.updatedAt,
  );
  const neighborhood =
    house.neighborhood !== undefined ? house.neighborhood : admin.neighborhood;
  const ownerPhone = editor.ownerPhone?.trim()
    ? editor.ownerPhone
    : admin.ownerPhone ?? null;
  const addedBy = editor.addedBy?.trim() ? editor.addedBy : admin.addedBy ?? null;
  if (
    address === house.address &&
    arrival === house.arrival &&
    notes === house.notes &&
    description === house.description &&
    neighborhood === house.neighborhood &&
    ownerPhone === editor.ownerPhone &&
    addedBy === editor.addedBy
  ) {
    return editor;
  }
  return {
    ...house,
    address,
    arrival,
    notes,
    description,
    neighborhood,
    ownerPhone,
    addedBy,
  };
}

export function adminHouseByIdMap(houses: readonly House[]): Map<string, House> {
  return new Map(houses.map((row) => [row.id, row]));
}
