"use client";

import { useEffect, useState } from "react";
import type { PresenceSummary } from "@/lib/presence";

export function useActivePresence(enabled = true) {
  const [summary, setSummary] = useState<PresenceSummary | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/presence", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as PresenceSummary & { active: number | null };
        if (cancelled || data.active === null) return;
        setSummary({ active: data.active, windowMinutes: data.windowMinutes });
      } catch {
        /* optional feature */
      }
    }

    void load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  return summary;
}
