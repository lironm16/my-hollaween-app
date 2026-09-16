"use client";

import { useCallback, useSyncExternalStore } from "react";
import { HOUSE_SET_EVENT, readHouseSet, writeHouseSet, type HouseSet } from "@/lib/house-set";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(HOUSE_SET_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(HOUSE_SET_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function useHouseSet() {
  const houseSet = useSyncExternalStore(
    subscribe,
    readHouseSet,
    () =>
      (process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
      process.env.NEXT_PUBLIC_PREVIEW_DEPLOY === "1"
        ? "all"
        : "real") as HouseSet,
  );
  const setHouseSet = useCallback((next: HouseSet) => {
    writeHouseSet(next);
  }, []);
  return { houseSet, setHouseSet };
}
