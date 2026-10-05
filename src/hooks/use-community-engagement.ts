"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";
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
      houses?: Record<string, HouseEngagementCounts>;
    };
    if (!data.houses) return;
    for (const [id, row] of Object.entries(data.houses)) {
      cache[id] = normalizeEngagementCounts(row);
    }
    emit();
  } catch {
    /* keep cache */
  }
}

export function useShowCommunityEngagementForHouse(_houseId: string) {
  const { admin } = useAdminSession();
  return showCommunityEngagementCounts(admin);
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
