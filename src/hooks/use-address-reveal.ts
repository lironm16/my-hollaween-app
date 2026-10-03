"use client";

import { useMemo } from "react";
import {
  canViewHouseLocationDetails,
  formatDisplayAddressWithPolicy,
  makeAddressRevealContext,
  mapsNavigationAllowed,
  visibleArrivalWithPolicy,
  type AddressRevealContext,
} from "@/lib/address-reveal";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useAppNow } from "@/hooks/use-app-clock";
import { useGemPreviewAsUser } from "@/hooks/use-gem-preview-as-user";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useCatalog } from "@/hooks/use-catalog";
import type { PublicHouse } from "@/lib/types";

export function useAddressReveal(): AddressRevealContext & {
  canViewDetails: (houseId: string) => boolean;
  formatDisplayAddress: (house: PublicHouse) => string;
  visibleArrival: (house: PublicHouse) => string;
  mapsAllowed: (houseId: string) => boolean;
  distanceAllowed: (houseId: string) => boolean;
} {
  const now = useAppNow();
  const { catalog } = useCatalog();
  const { admin } = useAdminSession();
  const { previewAsUser } = useGemPreviewAsUser();
  const owned = useOwnedHouses();
  const ownedHouseIds = useMemo(() => new Set(owned.map((item) => item.id)), [owned]);
  const addressRevealFromCatalog = catalog?.eventSettings?.addressReveal;
  const ctx = useMemo(
    () =>
      makeAddressRevealContext({
        now,
        isAdmin: admin && !previewAsUser,
        ownedHouseIds,
        addressReveal: addressRevealFromCatalog,
      }),
    [now, admin, previewAsUser, ownedHouseIds, addressRevealFromCatalog],
  );

  return useMemo(
    () => ({
      ...ctx,
      canViewDetails: (houseId: string) => canViewHouseLocationDetails(houseId, ctx),
      formatDisplayAddress: (house: PublicHouse) =>
        formatDisplayAddressWithPolicy(house, house.id, ctx),
      visibleArrival: (house: PublicHouse) => visibleArrivalWithPolicy(house, house.id, ctx),
      mapsAllowed: (houseId: string) => mapsNavigationAllowed(houseId, ctx),
      distanceAllowed: (houseId: string) => canViewHouseLocationDetails(houseId, ctx),
    }),
    [ctx],
  );
}
