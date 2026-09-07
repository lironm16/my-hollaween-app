"use client";

import { useEffect, useState } from "react";
import {
  EMPTY_TRAFFIC,
  overlayTraffic,
  pendingToEvents,
  TRAFFIC_KINDS,
  type HouseTraffic,
  type TrafficDelta,
  type TrafficKind,
} from "@/lib/traffic";

const FLUSH_MS = 800;
const POLL_MS = 60_000;
const PENDING_KEY = "hw-traffic-pending";

const reported: Record<TrafficKind, Set<string>> = {
  saved: new Set<string>(),
  visited: new Set<string>(),
  routed: new Set<string>(),
};

let bootstrapped = false;
let lifecycleBound = false;
let cache: Record<string, HouseTraffic> = {};
const pending: Record<string, HouseTraffic> = {};
const listeners = new Set<() => void>();
let flushTimer: number | null = null;
let inFlight = false;

function emit() {
  for (const listener of listeners) listener();
}

function sessionKey(kind: TrafficKind) {
  return `hw-traffic-${kind}`;
}

function emptyPending(): HouseTraffic {
  return { saved: 0, routed: 0, visited: 0 };
}

function isZero(row: HouseTraffic) {
  return row.saved === 0 && row.routed === 0 && row.visited === 0;
}

function readIdList(raw: string | null) {
  const ids = raw ? (JSON.parse(raw) as unknown) : [];
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

function loadReported() {
  if (bootstrapped || typeof window === "undefined") return;
  bootstrapped = true;
  for (const kind of TRAFFIC_KINDS) {
    try {
      const local = readIdList(localStorage.getItem(sessionKey(kind)));
      const session = readIdList(sessionStorage.getItem(sessionKey(kind)));
      for (const id of [...local, ...session]) reported[kind].add(id);
    } catch {
      /* ignore */
    }
  }
  try {
    const raw = localStorage.getItem(PENDING_KEY) ?? sessionStorage.getItem(PENDING_KEY);
    const stored = raw ? (JSON.parse(raw) as unknown) : null;
    if (stored && typeof stored === "object") {
      for (const [id, row] of Object.entries(stored as Record<string, Partial<HouseTraffic>>)) {
        if (!id) continue;
        pending[id] = {
          saved: Math.max(-1, Math.min(1, Number(row.saved) || 0)),
          routed: Math.max(-1, Math.min(1, Number(row.routed) || 0)),
          visited: Math.max(-1, Math.min(1, Number(row.visited) || 0)),
        };
        if (isZero(pending[id])) delete pending[id];
      }
    }
  } catch {
    /* ignore */
  }
  if (pendingToEvents(pending).length > 0) scheduleFlush();
}

function persistReported(kind: TrafficKind) {
  try {
    localStorage.setItem(sessionKey(kind), JSON.stringify([...reported[kind]]));
  } catch {
    /* private mode */
  }
}

function persistPending() {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* private mode */
  }
}

function queueDelta(houseId: string, kind: TrafficKind, delta: 1 | -1) {
  const row = { ...(pending[houseId] ?? emptyPending()) };
  row[kind] = Math.max(-1, Math.min(1, row[kind] + delta));
  if (isZero(row)) delete pending[houseId];
  else pending[houseId] = row;
  persistPending();
  emit();
  scheduleFlush();
}

function consumeSent(events: TrafficDelta[]) {
  for (const event of events) {
    const row = pending[event.houseId];
    if (!row) continue;
    row[event.kind] = Math.max(-1, Math.min(1, row[event.kind] - event.delta));
    if (isZero(row)) delete pending[event.houseId];
    else pending[event.houseId] = row;
  }
  persistPending();
  emit();
}

function scheduleFlush() {
  if (typeof window === "undefined") return;
  bindLifecycle();
  if (flushTimer != null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flush("fetch");
  }, FLUSH_MS);
}

async function postEvents(events: TrafficDelta[]) {
  const res = await fetch("/api/traffic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
    keepalive: true,
  });
  if (!res.ok) throw new Error("traffic post failed");
  const data = (await res.json()) as { houses?: Record<string, HouseTraffic> };
  consumeSent(events);
  if (data.houses) cache = data.houses;
  emit();
}

function beaconEvents(events: TrafficDelta[]) {
  const body = JSON.stringify({ events });
  try {
    void fetch("/api/traffic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).then((res) => {
      if (res.ok) consumeSent(events);
    });
    return true;
  } catch {
    return false;
  }
}

async function flush(mode: "fetch" | "beacon") {
  loadReported();
  const events = pendingToEvents(pending);
  if (events.length === 0) return;

  if (mode === "beacon") {
    if (inFlight) return;
    beaconEvents(events);
    return;
  }

  if (inFlight) {
    scheduleFlush();
    return;
  }
  inFlight = true;
  try {
    await postEvents(events);
  } catch {
    scheduleFlush();
  } finally {
    inFlight = false;
    if (pendingToEvents(pending).length > 0) scheduleFlush();
  }
}

function bindLifecycle() {
  if (lifecycleBound || typeof window === "undefined") return;
  lifecycleBound = true;
  const onHide = () => {
    if (flushTimer != null) {
      window.clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flush("beacon");
  };
  window.addEventListener("pagehide", onHide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") onHide();
  });
}

export function reportHouseTraffic(houseId: string, kind: TrafficKind, on: boolean) {
  loadReported();
  bindLifecycle();
  const already = reported[kind].has(houseId);
  if (on === already) return;
  if (on) reported[kind].add(houseId);
  else reported[kind].delete(houseId);
  persistReported(kind);
  queueDelta(houseId, kind, on ? 1 : -1);
}

export function useHouseTraffic() {
  const [houses, setHouses] = useState<Record<string, HouseTraffic>>(() => cache);
  const [queued, setQueued] = useState<Record<string, HouseTraffic>>(() => ({ ...pending }));

  useEffect(() => {
    loadReported();
    bindLifecycle();
    const onChange = () => {
      setHouses({ ...cache });
      setQueued({ ...pending });
    };
    listeners.add(onChange);
    onChange();
    let cancelled = false;
    async function refresh() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/traffic");
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
    const poll = window.setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      listeners.delete(onChange);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  function trafficFor(id: string): HouseTraffic {
    return overlayTraffic(houses[id] ?? EMPTY_TRAFFIC, queued[id]);
  }

  return { houses, trafficFor };
}
