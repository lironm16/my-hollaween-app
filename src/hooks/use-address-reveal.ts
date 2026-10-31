"use client";

import { useMemo } from "react";
import {
  canViewHouseLocationDetails,
  clusterDisplayAddressWithPolicy,
  formatDisplayAddressWithPolicy,
  makeAddressRevealContext,
  mapsNavigationAllowed,
  visibleArrivalWithPolicy,
  type AddressRevealContext,
} from "@/lib/address-reveal";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useAppNow } from "@/hooks/use-app-clock";
import { useGemPreviewAsUser } from "@/hooks/use-gem-preview-as-user";
import { adminShowsPrivateHouseFields } from "@/lib/gem-preview-as-user";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { useCatalog } from "@/hooks/use-catalog";
import { useLocale } from "@/hooks/use-locale";
import { useNightPass } from "@/hooks/use-night-pass";
import { nightPassAudience } from "@/lib/night-pass-client";
import type { PublicHouse } from "@/lib/types";

export function useAddressReveal(): AddressRevealContext & {
  canViewDetails: (houseId: string) => boolean;
  formatDisplayAddress: (house: PublicHouse) => string;
  formatClusterAddress: (houses: readonly PublicHouse[], fallback: PublicHouse) => string;
  visibleArrival: (house: PublicHouse) => string;
  mapsAllowed: (houseId: string) => boolean;
  distanceAllowed: (houseId: string) => boolean;
} {
  const { locale } = useLocale();
  const now = useAppNow();
  /** Map/list location policy only needs minute resolution — avoids rebuilding all pins every 15s. */
  const policyNow = useMemo(
    () => new Date(Math.floor(now.getTime() / 60_000) * 60_000),
    [now],
  );
  const { catalog } = useCatalog();
  const { admin } = useAdminSession();
  const { previewAsUser } = useGemPreviewAsUser();
  const owned = useOwnedHouses();
  const nightPass = useNightPass();
  const ownedHouseIds = useMemo(() => {
    const ids = new Set(owned.map((item) => item.id));
    if (nightPass.registered && nightPass.houseId) ids.add(nightPass.houseId);
    for (const id of nightPass.ownedHouseIds ?? []) {
      if (id.trim()) ids.add(id.trim());
    }
    return ids;
  }, [owned, nightPass.registered, nightPass.houseId, nightPass.ownedHouseIds]);
  const addressRevealFromCatalog = catalog?.eventSettings?.addressReveal;
  const audience = nightPassAudience(nightPass);
  const publicLocationIds = useMemo(
    () => (catalog?.houses ?? []).filter((house) => house.locationPublic).map((house) => house.id),
    [catalog?.houses],
  );
  const ctx = useMemo(
    () =>
      makeAddressRevealContext({
        now: policyNow,
        isAdmin: adminShowsPrivateHouseFields(admin, previewAsUser),
        ownedHouseIds,
        addressReveal: addressRevealFromCatalog,
        audience,
        publicLocationIds,
      }),
    [policyNow, admin, previewAsUser, ownedHouseIds, addressRevealFromCatalog, audience, publicLocationIds],
  );

  return useMemo(
    () => ({
      ...ctx,
      canViewDetails: (houseId: string) => canViewHouseLocationDetails(houseId, ctx),
      formatDisplayAddress: (house: PublicHouse) =>
        formatDisplayAddressWithPolicy(house, house.id, ctx, locale),
      formatClusterAddress: (houses: readonly PublicHouse[], fallback: PublicHouse) =>
        clusterDisplayAddressWithPolicy(houses, fallback, ctx, locale),
      visibleArrival: (house: PublicHouse) => visibleArrivalWithPolicy(house, house.id, ctx),
      mapsAllowed: (houseId: string) => mapsNavigationAllowed(houseId, ctx),
      distanceAllowed: (houseId: string) => canViewHouseLocationDetails(houseId, ctx),
    }),
    [ctx, locale],
  );
}
