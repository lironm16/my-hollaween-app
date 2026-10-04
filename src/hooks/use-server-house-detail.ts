"use client";

import { useEffect, useState } from "react";
import { houseNeedsLocationHydration, isDeviceCachePinHouse } from "@/lib/device-catalog-cache";
import { houseWithLocationPolicy, visitorAddressRevealContext } from "@/lib/address-reveal";
import { appNow } from "@/lib/app-clock";
import { fetchPublicHouse, notifyHouseDetailLoaded } from "@/lib/fetch-public-house";
import { readGemPreviewAsUser } from "@/lib/gem-preview-as-user";
import { useAdminHouseFields } from "@/hooks/use-admin-house-fields";
import { noteCatalogRemovals } from "@/lib/catalog-removed";
import { loadOwnedHouses } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

export function useServerHouseDetail(house: PublicHouse | null) {
  const [resolved, setResolved] = useState<PublicHouse | null>(house);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    setResolved(house);
    setUnavailable(false);
    if (!house) {
      setLoading(false);
      return;
    }
    if (!houseNeedsLocationHydration(house)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      const result = await fetchPublicHouse(house.id);
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        if (
          result.status === 404 &&
          loadOwnedHouses().some((row) => row.id === house.id)
        ) {
          noteCatalogRemovals([house.id], new Date().toISOString());
        }
        setUnavailable(result.status === 404);
        return;
      }
      let detail = result.house;
      if (readGemPreviewAsUser()) {
        const now = appNow();
        detail = houseWithLocationPolicy(
          detail,
          visitorAddressRevealContext(
            now,
            loadOwnedHouses().map((row) => row.id),
          ),
        );
      }
      setResolved(detail);
      notifyHouseDetailLoaded(detail);
    })();

    return () => {
      cancelled = true;
    };
  }, [house?.id, house?.updatedAt, house?.deviceCachePin, house?.address]);

  const active = useAdminHouseFields(resolved ?? house) ?? resolved ?? house;
  return {
    house: active,
    loading,
    unavailable,
    detailReady: Boolean(active && !houseNeedsLocationHydration(active)),
  };
}
