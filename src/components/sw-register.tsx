"use client";

import { useEffect } from "react";
import { appVersion } from "@/lib/app-version";
import { postMapTileCacheConfig } from "@/lib/map-tile-cache";
import {
  fetchPublishedAppVersion,
  isServiceWorkerUpdateReady,
  versionsDiffer,
} from "@/lib/sw-update";

function promoteWaitingWorker(
  registration: ServiceWorkerRegistration,
  onPromoted: () => void,
) {
  if (!registration.waiting || !navigator.serviceWorker.controller) return;
  onPromoted();
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
}

function watchForUpdate(
  registration: ServiceWorkerRegistration,
  onPromoted: () => void,
) {
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (
        isServiceWorkerUpdateReady(worker.state, Boolean(navigator.serviceWorker.controller))
      ) {
        onPromoted();
        worker.postMessage({ type: "SKIP_WAITING" });
      }
    });
  });
}

/** Register SW; silently reload when package.json version on server is newer. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let reloaded = false;
    let pendingVersionReload = false;

    const markPendingReload = () => {
      pendingVersionReload = true;
    };

    const onControllerChange = () => {
      if (!pendingVersionReload || reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const applyIfNewVersion = async (registration: ServiceWorkerRegistration) => {
      const published = await fetchPublishedAppVersion();
      if (!published || !versionsDiffer(appVersion(), published)) return;
      await registration.update();
      promoteWaitingWorker(registration, markPendingReload);
    };

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async (registration) => {
        if (cancelled) return;
        watchForUpdate(registration, markPendingReload);
        promoteWaitingWorker(registration, markPendingReload);
        await applyIfNewVersion(registration);
        postMapTileCacheConfig();
      })
      .catch(() => {
        /* offline / blocked — map still works without SW */
      });

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void navigator.serviceWorker
        .getRegistration("/")
        .then((registration) => {
          if (!registration || cancelled) return;
          return applyIfNewVersion(registration);
        })
        .then(() => {
          if (!cancelled) postMapTileCacheConfig();
        });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
