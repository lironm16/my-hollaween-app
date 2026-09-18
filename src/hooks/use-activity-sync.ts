"use client";

import { useEffect } from "react";
import { loadLikedIds, loadVisitedIds } from "@/lib/offline-db";

const DEBOUNCE_MS = 30_000;

/** Debounced neighborhood totals — one POST per device when like/visit counts change. */
export function useActivitySync() {
  useEffect(() => {
    let timer: number | undefined;
    let lastLiked = loadLikedIds().length;
    let lastVisited = loadVisitedIds().length;
    let flushing = false;

    async function flush() {
      if (flushing) return;
      const liked = loadLikedIds().length;
      const visited = loadVisitedIds().length;
      const likedDelta = liked - lastLiked;
      const visitedDelta = visited - lastVisited;
      if (likedDelta === 0 && visitedDelta === 0) return;

      flushing = true;
      try {
        const res = await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ likedDelta, visitedDelta }),
          keepalive: true,
        });
        if (res.ok) {
          lastLiked = liked;
          lastVisited = visited;
        }
      } catch {
        /* retry on next debounced change */
      } finally {
        flushing = false;
      }
    }

    function schedule() {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => void flush(), DEBOUNCE_MS);
    }

    const onChange = () => schedule();
    window.addEventListener("hw-liked-changed", onChange);
    window.addEventListener("hw-visited-changed", onChange);
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("hw-liked-changed", onChange);
      window.removeEventListener("hw-visited-changed", onChange);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);
}
