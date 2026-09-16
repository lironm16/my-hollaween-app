"use client";

import { useEffect, useState } from "react";
import {
  clearSkipNote,
  getSkipNote,
  getSkippedMeta,
  loadSkippedIds,
  saveSkipNote,
  skipHouse,
  toggleSkipped,
  unskipAllHouses,
  unskipHouse,
  updateSkipHouse,
  type SkippedHouseMeta,
} from "@/lib/offline-db";

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
    skip: (id: string, meta?: SkippedHouseMeta) => {
      const next = skipHouse(id, meta);
      setIds(next);
      return next;
    },
    update: (id: string, meta: SkippedHouseMeta) => {
      const next = updateSkipHouse(id, meta);
      setIds(next);
      return next;
    },
    meta: (id: string) => getSkippedMeta(id),
    note: (id: string) => getSkipNote(id),
    saveNote: (id: string, note: string) => saveSkipNote(id, note),
    clearNote: (id: string) => clearSkipNote(id),
    unskip: (id: string) => {
      const next = unskipHouse(id);
      setIds(next);
      return next;
    },
    unskipAll: () => {
      const next = unskipAllHouses();
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
