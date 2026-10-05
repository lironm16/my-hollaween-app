"use client";

import { useEffect, useState } from "react";
import { ensureEngagementClientLifecycle, reportEngagement } from "@/lib/activity-client";
import { loadLikedIds, toggleLiked } from "@/lib/offline-db";

export function useLikedHouses() {
  const [ids, setIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : loadLikedIds(),
  );

  useEffect(() => {
    const read = () => setIds(loadLikedIds());
    read();
    window.addEventListener("storage", read);
    window.addEventListener("hw-liked-changed", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("hw-liked-changed", read);
    };
  }, []);

  return {
    likedIds: ids,
    liked: (id: string) => ids.includes(id),
    toggle: (id: string) => {
      const wasOn = loadLikedIds().includes(id);
      const next = toggleLiked(id);
      setIds(next);
      ensureEngagementClientLifecycle();
      reportEngagement(id, "like", !wasOn);
      return next;
    },
  };
}
