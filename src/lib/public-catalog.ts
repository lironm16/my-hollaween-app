import { toPublicHouse } from "@/lib/ids";
import { isPubliclyListed } from "@/lib/house-state";
import { isStubHouse } from "@/lib/house-set";
import type { House, PublicHouse } from "@/lib/types";

/** Approved houses for the public catalog — rehearsal stubs stay on /api/admin/stubs. */
export function housesForPublicCatalog(houses: House[], includeStubs = false): PublicHouse[] {
  return houses
    .filter((house) => isPubliclyListed(house))
    .filter((house) => includeStubs || !isStubHouse(house))
    .map((house) => toPublicHouse(house));
}
