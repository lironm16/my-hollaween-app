import { loadDeletedHouseIds } from "@/lib/deleted-houses";
import { fetchPublicHouse } from "@/lib/fetch-public-house";
import { loadOwnedHouses, loadPendingWrites } from "@/lib/offline-db";
import { loadServerRemovedHouseIds, noteServerRemovedHouses } from "@/lib/server-removed-houses";

/** Saved houses worth asking about — not already known deleted, not still waiting to upload. */
export function ownedHouseIdsToVerify(): string[] {
  const skip = new Set([
    ...loadDeletedHouseIds(),
    ...loadServerRemovedHouseIds(),
    ...loadPendingWrites().map((write) => write.id),
  ]);
  return loadOwnedHouses()
    .map((item) => item.id)
    .filter((id) => id && !skip.has(id));
}

/**
 * Delta polls only report deletions newer than the device cursor, so a saved house deleted
 * before the device caught up is never reported. A 404 from the house endpoint is explicit.
 */
export async function verifyOwnedHousesOnServer(
  fetchHouse: typeof fetchPublicHouse = fetchPublicHouse,
): Promise<string[]> {
  const gone: string[] = [];
  for (const id of ownedHouseIdsToVerify()) {
    try {
      const result = await fetchHouse(id);
      if (!result.ok && result.status === 404) gone.push(id);
    } catch {
      /* offline or timeout — try again next launch */
    }
  }
  noteServerRemovedHouses(gone);
  return gone;
}
