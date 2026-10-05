"use client";

import { useEffect, useState } from "react";
import { ensureEngagementClientLifecycle, reportEngagement } from "@/lib/activity-client";
import { loadVisitedIds, toggleVisited } from "@/lib/offline-db";

export function useVisitedHouses() {
  const [ids, setIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : loadVisitedIds(),
  );

  useEffect(() => {
    const read = () => setIds(loadVisitedIds());
    read();
    window.addEventListener("storage", read);
    window.addEventListener("hw-visited-changed", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("hw-visited-changed", read);
    };
  }, []);

  return {
    visitedIds: ids,
    visited: (id: string) => ids.includes(id),
    toggle: (id: string) => {
      const wasOn = loadVisitedIds().includes(id);
      const next = toggleVisited(id);
      setIds(next);
      ensureEngagementClientLifecycle();
      reportEngagement(id, "visit", !wasOn);
      return next;
    },
  };
}
