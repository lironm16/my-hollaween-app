"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  CLOCK_EVENT,
  clockSnapshot,
  dateFromSnapshot,
  hydrationSafeClockSnapshot,
} from "@/lib/app-clock";

const AppClockContext = createContext<Date | null>(null);

/** One 15s wall clock for the whole app — avoids duplicate intervals per hook caller. */
export function AppClockProvider({ children }: { children: React.ReactNode }) {
  /** 0 until mounted tick — hydration uses {@link hydrationSafeClockSnapshot}. */
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    const tick = () => setStamp(clockSnapshot());
    tick();
    const id = window.setInterval(tick, 15_000);
    window.addEventListener(CLOCK_EVENT, tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(CLOCK_EVENT, tick);
    };
  }, []);

  const now = useMemo(
    () => dateFromSnapshot(stamp !== 0 ? stamp : hydrationSafeClockSnapshot()),
    [stamp],
  );

  return <AppClockContext.Provider value={now}>{children}</AppClockContext.Provider>;
}

export function useAppClockContext() {
  return useContext(AppClockContext);
}
