"use client";

import { useEffect, useState } from "react";
import { loadSkippedIds, skipHouse, toggleSkipped, unskipHouse } from "@/lib/offline-db";

export function useSkippedHouses() {
  const [ids, setIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : loadSkippedIds(),
  );

  useEffect(() => {
    const read = () => setIds(loadSkippedIds());
    read();
    window.addEventListener("storage", read);
    window.addEventListener("hw-skipped-changed", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("hw-skipped-changed", read);
    };
  }, []);

  return {
    skippedIds: ids,
    skipped: (id: string) => ids.includes(id),
    skip: (id: string) => {
      const next = skipHouse(id);
      setIds(next);
      return next;
    },
    unskip: (id: string) => {
      const next = unskipHouse(id);
      setIds(next);
      return next;
    },
    toggle: (id: string) => {
      const next = toggleSkipped(id);
      setIds(next);
      return next;
    },
  };
}
