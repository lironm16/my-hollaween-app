"use client";

import { useEffect } from "react";

const SESSION_KEY = "hw-presence-session";
const PING_MS = 120_000;

function presenceSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function ping() {
  const id = presenceSessionId();
  if (!id || document.visibilityState === "hidden") return;
  void fetch("/api/presence", {
    method: "POST",
    headers: { "x-hw-session": id },
    keepalive: true,
  });
}

/** Lightweight “active now” signal for תמונת מצב — not Vercel Analytics. */
export function PresenceHeartbeat() {
  useEffect(() => {
    ping();
    const timer = window.setInterval(ping, PING_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return null;
}
