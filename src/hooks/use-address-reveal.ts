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
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import type { PublicHouse } from "@/lib/types";

export function useAddressReveal(): AddressRevealContext & {
  canViewDetails: (houseId: string) => boolean;
  formatDisplayAddress: (house: PublicHouse) => string;
  visibleArrival: (house: PublicHouse) => string;
  mapsAllowed: (houseId: string) => boolean;
} {
  const now = useAppNow();
  const { admin } = useAdminSession();
  const owned = useOwnedHouses();
  const ownedHouseIds = useMemo(() => new Set(owned.map((item) => item.id)), [owned]);
  const ctx = useMemo(
    () => makeAddressRevealContext({ now, isAdmin: admin, ownedHouseIds }),
    [now, admin, ownedHouseIds],
  );

  return useMemo(
    () => ({
      ...ctx,
      canViewDetails: (houseId: string) => canViewHouseLocationDetails(houseId, ctx),
      formatDisplayAddress: (house: PublicHouse) =>
        formatDisplayAddressWithPolicy(house, house.id, ctx),
      visibleArrival: (house: PublicHouse) => visibleArrivalWithPolicy(house, house.id, ctx),
      mapsAllowed: (houseId: string) => mapsNavigationAllowed(houseId, ctx),
    }),
    [ctx],
  );
}
