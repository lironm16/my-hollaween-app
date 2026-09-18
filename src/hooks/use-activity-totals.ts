"use client";

import { useEffect, useState } from "react";
import type { ActivityTotals } from "@/lib/activity-totals";

export function useActivityTotals(enabled = true) {
  const [totals, setTotals] = useState<ActivityTotals | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/activity", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as ActivityTotals;
        if (!cancelled && typeof data.likedTotal === "number") setTotals(data);
      } catch {
        /* stats page still works without neighborhood totals */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return totals;
}
