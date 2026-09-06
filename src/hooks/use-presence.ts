"use client";

import { useEffect, useState } from "react";

const DEVICE_KEY = "hw-device-id";
const HEARTBEAT_MS = 60_000;

let beating = false;
let lastOnline: number | null = null;
const listeners = new Set<() => void>();

function emitOnline() {
  for (const listener of listeners) listener();
}

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
    const res = await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      keepalive: true,
    });
    if (!res.ok) return;
    const data = (await res.json()) as { online?: number };
    if (typeof data.online === "number") {
      lastOnline = data.online;
      emitOnline();
    }
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

export function useOnlineDevices(enabled = true) {
  const [online, setOnline] = useState<number | null>(lastOnline);

  useEffect(() => {
    startHeartbeat();
  }, []);

  useEffect(() => {
    const onChange = () => setOnline(lastOnline);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return enabled ? online : null;
}
