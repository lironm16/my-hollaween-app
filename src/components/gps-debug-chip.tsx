"use client";

import { useEffect, useState } from "react";
import { readAndroidGeoDebug } from "@/lib/android-geo-watch";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";
import type { UserLocation } from "@/hooks/use-user-location";

/** Admin map overlay — confirms whether Android GPS is updating or stuck on cache. */
export function GpsDebugChip({ location }: { location: UserLocation | null }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isAndroidLike()) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!isAndroidLike()) return null;
  void tick;
  const dbg = readAndroidGeoDebug();
  const fixAge =
    location?.measuredAt != null
      ? Math.round((Date.now() - location.measuredAt) / 1000)
      : dbg.fixAgeMs != null
        ? Math.round(dbg.fixAgeMs / 1000)
        : null;
  const coordsStale =
    dbg.coordsStaleMs != null ? Math.round(dbg.coordsStaleMs / 1000) : null;
  return (
    <div
      className="pointer-events-none absolute start-2 top-14 z-[600] max-w-[min(100%,16rem)] rounded-lg bg-black/75 px-2 py-1 text-[11px] leading-snug text-sky-100 ring-1 ring-sky-500/40"
      dir="ltr"
    >
      <div>GPS dbg · subs {dbg.subscribers}</div>
      <div>fix age {fixAge ?? "—"}s · same coords {coordsStale ?? "—"}s</div>
      {location ? (
        <div>
          {location.lat.toFixed(5)}, {location.lng.toFixed(5)} ±{Math.round(location.accuracy)}m
        </div>
      ) : null}
    </div>
  );
}
