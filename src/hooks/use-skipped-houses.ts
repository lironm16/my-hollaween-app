"use client";

import { useEffect, useState } from "react";
import {
  clearSkipReasonUserData,
  clearSkipNote,
  getSkipNote,
  getSkipReasonCategory,
  getSkippedMeta,
  loadSkippedIds,
  saveSkipNote,
  saveSkipReasonCategory,
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

  const [notesTick, setNotesTick] = useState(0);

  useEffect(() => {
    const read = () => setIds(loadSkippedIds());
    const readNotes = () => setNotesTick((n) => n + 1);
    read();
    window.addEventListener("storage", read);
    window.addEventListener("hw-skipped-changed", read);
    window.addEventListener("hw-skip-notes-changed", readNotes);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("hw-skipped-changed", read);
      window.removeEventListener("hw-skip-notes-changed", readNotes);
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
    note: (id: string) => {
      void notesTick;
      return getSkipNote(id);
    },
    skipCategory: (id: string) => {
      void notesTick;
      return getSkipReasonCategory(id);
    },
    saveNote: (id: string, note: string) => saveSkipNote(id, note),
    saveSkipCategory: (id: string, category: "not-open" | "candy-out" | "other") =>
      saveSkipReasonCategory(id, category),
    clearNote: (id: string) => clearSkipNote(id),
    clearSkipReasonUserData: (id: string) => {
      clearSkipReasonUserData(id);
      setNotesTick((n) => n + 1);
    },
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
