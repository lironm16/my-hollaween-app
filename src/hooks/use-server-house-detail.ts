"use client";

import { useEffect, useState } from "react";
import { houseNeedsLocationHydration } from "@/lib/device-catalog-cache";
import { houseWithLocationPolicy, visitorAddressRevealContext } from "@/lib/address-reveal";
import { appNow } from "@/lib/app-clock";
import { notifyHouseDetailLoaded } from "@/lib/fetch-public-house";
import {
  fetchPublicHouseSession,
  houseNeedsSessionHydration,
  readSessionHouseDetail,
  rememberSessionHouseDetail,
} from "@/lib/house-detail-session-cache";
import { readGemPreviewAsUser } from "@/lib/gem-preview-as-user";
import { useAdminHouseFields } from "@/hooks/use-admin-house-fields";
import { loadOwnedHouses } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

const LOADING_DELAY_MS = 400;

function applyPreviewPolicy(detail: PublicHouse): PublicHouse {
  if (!readGemPreviewAsUser()) return detail;
  const now = appNow();
  return houseWithLocationPolicy(
    detail,
    visitorAddressRevealContext(
      now,
      loadOwnedHouses().map((row) => row.id),
    ),
  );
}

export function useServerHouseDetail(house: PublicHouse | null) {
  const [resolved, setResolved] = useState<PublicHouse | null>(() =>
    house ? readSessionHouseDetail(house.id) ?? house : null,
  );
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!house) {
      setResolved(null);
      setUnavailable(false);
      setLoading(false);
      return;
    }

    const cached = readSessionHouseDetail(house.id);
    if (cached) {
      setResolved(cached);
      setUnavailable(false);
      setLoading(false);
      return;
    }

    setResolved(house);
    setUnavailable(false);

    if (!houseNeedsSessionHydration(house)) {
      rememberSessionHouseDetail(house);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadingTimer = window.setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, LOADING_DELAY_MS);

    void (async () => {
      const result = await fetchPublicHouseSession(house.id);
      if (cancelled) return;
      window.clearTimeout(loadingTimer);
      setLoading(false);
      if (!result.ok) {
        setUnavailable(result.status !== 404);
        return;
      }
      let detail = applyPreviewPolicy(result.house);
      rememberSessionHouseDetail(detail);
      setResolved(detail);
      notifyHouseDetailLoaded(detail);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
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
