"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/hooks/use-catalog";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { showCommunityEngagementCounts } from "@/lib/community-engagement-ui";
import type { HouseEngagementCounts } from "@/lib/house-engagement";
import { normalizeEngagementCounts } from "@/lib/house-engagement";

const POLL_MS = 60_000;
const cache: Record<string, HouseEngagementCounts> = {};
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

async function fetchCounts(ids: string[]) {
  if (!ids.length) return;
  const q = ids.join(",");
  try {
    const res = await fetch(`/api/activity/counts?ids=${encodeURIComponent(q)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      enabled?: boolean;
      houses?: Record<string, HouseEngagementCounts>;
    };
    if (!data.enabled || !data.houses) return;
    for (const [id, row] of Object.entries(data.houses)) {
      cache[id] = normalizeEngagementCounts(row);
    }
    emit();
  } catch {
    /* keep cache */
  }
}

export function useCommunityEngagementEnabled() {
  const { catalog } = useCatalog();
  return useMemo(
    () => Boolean(catalog?.eventSettings?.communityEngagementEnabled),
    [catalog?.eventSettings?.communityEngagementEnabled],
  );
}

export function useShowCommunityEngagementForHouse(houseId: string) {
  const enabled = useCommunityEngagementEnabled();
  const { admin } = useAdminSession();
  const owned = useOwnedHouses();
  const ownedSet = useMemo(() => new Set(owned.map((item) => item.id)), [owned]);
  return showCommunityEngagementCounts(enabled, admin, ownedSet, houseId);
}

export function useHouseEngagementCounts(houseId: string) {
  const show = useShowCommunityEngagementForHouse(houseId);
  const [counts, setCounts] = useState<HouseEngagementCounts>(() =>
    normalizeEngagementCounts(cache[houseId]),
  );

  const refresh = useCallback(() => {
    if (!show || !houseId) return;
    void fetchCounts([houseId]);
  }, [show, houseId]);

  useEffect(() => {
    if (!show) return;
    const onChange = () => setCounts(normalizeEngagementCounts(cache[houseId]));
    listeners.add(onChange);
    onChange();
    refresh();
    const timer = window.setInterval(refresh, POLL_MS);
    return () => {
      listeners.delete(onChange);
      window.clearInterval(timer);
    };
  }, [show, houseId, refresh]);

  return show ? counts : null;
}
