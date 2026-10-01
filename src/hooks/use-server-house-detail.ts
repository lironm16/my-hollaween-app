"use client";

import { useEffect, useState } from "react";
import { isDeviceCachePinHouse } from "@/lib/device-catalog-cache";
import { fetchPublicHouse, notifyHouseDetailLoaded } from "@/lib/fetch-public-house";
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
    if (!isDeviceCachePinHouse(house)) {
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
        setUnavailable(result.status === 404);
        return;
      }
      setResolved(result.house);
      notifyHouseDetailLoaded(result.house);
    })();

    return () => {
      cancelled = true;
    };
  }, [house?.id, house?.updatedAt, house?.deviceCachePin]);

  const active = resolved ?? house;
  return {
    house: active,
    loading,
    unavailable,
    detailReady: Boolean(active && !isDeviceCachePinHouse(active)),
  };
}
