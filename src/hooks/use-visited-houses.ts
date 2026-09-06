"use client";

import { useEffect, useState } from "react";
import { loadVisitedIds, toggleVisited } from "@/lib/offline-db";

export function useVisitedHouses() {
  const [ids, setIds] = useState<string[]>([]);

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
      const next = toggleVisited(id);
      setIds(next);
      return next;
    },
  };
}
