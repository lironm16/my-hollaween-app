import type { EditorHouse, House, PublicHouse } from "@/lib/types";

/** Overlay catalog/redacted rows with the admin API snapshot (street, arrival, contact). */
export function mergePublicHouseWithAdminRow(
  house: PublicHouse,
  admin?: House | null,
): EditorHouse {
  if (!admin) return house as EditorHouse;
  const editor = house as EditorHouse;
  const address = house.address?.trim() ? house.address : (admin.address ?? "");
  const arrival = house.arrival?.trim() ? house.arrival : (admin.arrival ?? "");
  const notes = house.notes?.trim() ? house.notes : admin.notes;
  const description = house.description?.trim() ? house.description : admin.description;
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
