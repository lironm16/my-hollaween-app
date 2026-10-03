"use client";

import { useEffect, useState } from "react";
import { isDeviceCachePinHouse } from "@/lib/device-catalog-cache";
import { houseWithLocationPolicy, visitorAddressRevealContext } from "@/lib/address-reveal";
import { appNow } from "@/lib/app-clock";
import { fetchPublicHouse, notifyHouseDetailLoaded } from "@/lib/fetch-public-house";
import { readGemPreviewAsUser } from "@/lib/gem-preview-as-user";
import { loadOwnedHouses } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

export function useServerHouseDetail(house: PublicHouse | null) {
  const [resolved, setResolved] = useState<PublicHouse | null>(house);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [trackedHouse, setTrackedHouse] = useState(house);

  if (house !== trackedHouse) {
    setTrackedHouse(house);
    setResolved(house);
    setUnavailable(false);
    setLoading(Boolean(house && isDeviceCachePinHouse(house)));
  }

  useEffect(() => {
    if (!house) return;
    if (!isDeviceCachePinHouse(house)) return;

    let cancelled = false;
    void (async () => {
      const result = await fetchPublicHouse(house.id);
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
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
  }, [house]);

  const active = resolved ?? house;
  return {
    house: active,
    loading,
    unavailable,
    detailReady: Boolean(active && !isDeviceCachePinHouse(active)),
  };
}
