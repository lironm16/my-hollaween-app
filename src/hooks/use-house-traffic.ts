"use client";

import { useEffect, useState } from "react";
import type { HouseTraffic } from "@/lib/traffic";
import { EMPTY_TRAFFIC } from "@/lib/traffic";

type Event = { houseId: string; kind: keyof HouseTraffic; delta: 1 | -1 };

const reported = {
  saved: new Set<string>(),
  visited: new Set<string>(),
  routed: new Set<string>(),
};

let bootstrapped = false;
let cache: Record<string, HouseTraffic> = {};
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function sessionKey(kind: keyof HouseTraffic) {
  return `hw-traffic-${kind}`;
}

function loadReported() {
  if (bootstrapped || typeof window === "undefined") return;
  bootstrapped = true;
  for (const kind of ["saved", "visited", "routed"] as const) {
    try {
      const raw = sessionStorage.getItem(sessionKey(kind));
      const ids = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(ids)) {
        for (const id of ids) if (typeof id === "string") reported[kind].add(id);
      }
    } catch {
      /* ignore */
    }
  }
}

function persistReported(kind: keyof HouseTraffic) {
  try {
    sessionStorage.setItem(sessionKey(kind), JSON.stringify([...reported[kind]]));
  } catch {
    /* private mode */
  }
}

async function postEvents(events: Event[]) {
  if (events.length === 0) return;
  try {
    const res = await fetch("/api/traffic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
    if (!res.ok) return;
    const data = (await res.json()) as { houses?: Record<string, HouseTraffic> };
    if (data.houses) {
      cache = data.houses;
      emit();
    }
  } catch {
    /* counts are best-effort */
  }
}

export function reportHouseTraffic(houseId: string, kind: keyof HouseTraffic, on: boolean) {
  loadReported();
  const already = reported[kind].has(houseId);
  if (on && already) return;
  if (!on && !already) return;
  if (on) reported[kind].add(houseId);
  else reported[kind].delete(houseId);
  persistReported(kind);
  void postEvents([{ houseId, kind, delta: on ? 1 : -1 }]);
}

export function reportRouteStops(houseIds: string[]) {
  loadReported();
  const events: Event[] = [];
  for (const houseId of houseIds) {
    if (reported.routed.has(houseId)) continue;
    reported.routed.add(houseId);
    events.push({ houseId, kind: "routed", delta: 1 });
  }
  persistReported("routed");
  void postEvents(events);
}

export function useHouseTraffic() {
  const [houses, setHouses] = useState<Record<string, HouseTraffic>>(() => cache);

  useEffect(() => {
    const onChange = () => setHouses({ ...cache });
    listeners.add(onChange);
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch("/api/traffic", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { houses?: Record<string, HouseTraffic> };
        if (!cancelled && data.houses) {
          cache = data.houses;
          emit();
        }
      } catch {
        /* keep last */
      }
    }
    if (Object.keys(cache).length === 0) void refresh();
    const poll = window.setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      listeners.delete(onChange);
      window.clearInterval(poll);
    };
  }, []);

  function trafficFor(id: string): HouseTraffic {
    return houses[id] ?? EMPTY_TRAFFIC;
  }

  return { houses, trafficFor };
}
