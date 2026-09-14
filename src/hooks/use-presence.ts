"use client";

import { useEffect, useState } from "react";

const PRESENCE_POLL_MS = 60_000;

async function fetchOnline(): Promise<number | null> {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return null;
  try {
    const res = await fetch("/api/presence", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { online?: number };
    return typeof data.online === "number" ? data.online : null;
  } catch {
    return null;
  }
}

/** Polls GET /api/presence — use only on pages that display the online count (e.g. תמונת מצב). */
export function useOnlineDevices(enabled = true) {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = () => {
      void fetchOnline().then((count) => {
        if (!cancelled && count !== null) setOnline(count);
      });
    };

    load();
    const timer = window.setInterval(load, PRESENCE_POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled]);

  return enabled ? online : null;
}
