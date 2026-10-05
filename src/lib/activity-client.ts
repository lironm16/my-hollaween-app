"use client";

import { getDeviceId } from "@/lib/device-id";
import type { EngagementEvent, EngagementKind } from "@/lib/house-engagement";

const FLUSH_MS = 900;
const reported = { like: new Set<string>(), visit: new Set<string>() };
let pending: EngagementEvent[] = [];
let flushTimer: number | null = null;
let inflight: Promise<void> | null = null;

function scheduleFlush() {
  if (typeof window === "undefined") return;
  if (flushTimer != null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_MS);
}

async function flush() {
  if (inflight) return inflight;
  if (!pending.length) return;
  const deviceId = getDeviceId();
  if (!deviceId) return;
  const events = pending;
  pending = [];
  inflight = fetch("/api/activity", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-HW-Device-Id": deviceId,
    },
    body: JSON.stringify({ events }),
    cache: "no-store",
    keepalive: true,
  })
    .catch(() => {
      pending = [...events, ...pending];
    })
    .finally(() => {
      inflight = null;
      if (pending.length) scheduleFlush();
    }) as Promise<void>;
  return inflight;
}

export function reportEngagement(houseId: string, kind: EngagementKind, on: boolean) {
  if (typeof window === "undefined" || !houseId) return;
  const set = kind === "like" ? reported.like : reported.visit;
  const already = set.has(houseId);
  if (on === already) return;
  if (on) set.add(houseId);
  else set.delete(houseId);
  pending.push({ houseId, kind, delta: on ? 1 : -1 });
  scheduleFlush();
}

function bindLifecycle() {
  if (typeof window === "undefined") return;
  const onHide = () => {
    if (flushTimer != null) {
      window.clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flush();
  };
  window.addEventListener("pagehide", onHide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") onHide();
  });
}

let lifecycle = false;
export function ensureEngagementClientLifecycle() {
  if (lifecycle) return;
  lifecycle = true;
  bindLifecycle();
}
