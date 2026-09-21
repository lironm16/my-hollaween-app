"use client";

import { useEffect } from "react";
import { postMapTileCacheConfig } from "@/lib/map-tile-cache";

/** Register the app service worker (shell cache + validated map tiles). Push reuses the same /sw.js. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (cancelled) return;
        void registration.update();
        postMapTileCacheConfig();
      })
      .catch(() => {
        /* offline / blocked — map still works without SW */
      });

    const onController = () => postMapTileCacheConfig();
    navigator.serviceWorker.addEventListener("controllerchange", onController);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onController);
    };
  }, []);

  return null;
}
