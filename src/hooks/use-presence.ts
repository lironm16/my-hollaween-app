"use client";

import { useEffect, useState } from "react";

const DEVICE_KEY = "hw-device-id";
const HEARTBEAT_MS = 60_000;
const POLL_MS = 30_000;

let beating = false;

function deviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `d${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return "";
  }
}

async function beat() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  const id = deviceId();
  if (!id) return;
  try {
    await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

function startHeartbeat() {
  if (beating || typeof window === "undefined") return;
  beating = true;
  void beat();
  window.setInterval(() => void beat(), HEARTBEAT_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void beat();
  });
}

export function PresenceBeacon() {
  useEffect(() => {
    startHeartbeat();
  }, []);
  return null;
}

export function useOnlineDevices(enabled: boolean) {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    startHeartbeat();
  }, []);

  useEffect(() => {
    if (!enabled) {
      setOnline(null);
      return;
    }
    let cancelled = false;
    async function refresh() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/presence", { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { online?: number };
        if (!cancelled && typeof data.online === "number") setOnline(data.online);
      } catch {
        /* keep last */
      }
    }
    void refresh();
    const poll = window.setInterval(() => void refresh(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  return online;
}
