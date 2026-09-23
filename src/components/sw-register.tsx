"use client";

import { useEffect } from "react";
import { appVersion } from "@/lib/app-version";
import { postMapTileCacheConfig } from "@/lib/map-tile-cache";
import {
  fetchPublishedAppVersion,
  isServiceWorkerUpdateReady,
  versionsDiffer,
} from "@/lib/sw-update";

const UPDATE_POLL_MS = 4 * 60 * 1000;

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

async function checkForAppUpdate(
  registration: ServiceWorkerRegistration,
  onPromoted: () => void,
) {
  try {
    await registration.update();
  } catch {
    /* offline / throttled */
  }

  const published = await fetchPublishedAppVersion();
  const versionBump = Boolean(published && versionsDiffer(appVersion(), published));

  if (versionBump || registration.waiting) {
    promoteWaitingWorker(registration, onPromoted);
  }
}

/** Register SW; silently reload when a newer deploy is published. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let reloaded = false;
    let pendingVersionReload = false;
    let pollId: number | undefined;

    const markPendingReload = () => {
      pendingVersionReload = true;
    };

    const onControllerChange = () => {
      if (!pendingVersionReload || reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const runUpdateCheck = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      void navigator.serviceWorker
        .getRegistration("/")
        .then((registration) => {
          if (!registration || cancelled) return;
          return checkForAppUpdate(registration, markPendingReload);
        })
        .then(() => {
          if (!cancelled) postMapTileCacheConfig();
        });
    };

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async (registration) => {
        if (cancelled) return;
        watchForUpdate(registration, markPendingReload);
        promoteWaitingWorker(registration, markPendingReload);
        await checkForAppUpdate(registration, markPendingReload);
        postMapTileCacheConfig();
      })
      .catch(() => {
        /* offline / blocked — map still works without SW */
      });

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      runUpdateCheck();
    };

    const onOnline = () => runUpdateCheck();
    const onFocus = () => runUpdateCheck();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    pollId = window.setInterval(runUpdateCheck, UPDATE_POLL_MS);

    return () => {
      cancelled = true;
      if (pollId !== undefined) window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
