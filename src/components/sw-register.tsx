"use client";

import { useEffect } from "react";
import { appVersion } from "@/lib/app-version";
import { postMapTileCacheConfig } from "@/lib/map-tile-cache";
import { isUserMidInteraction } from "@/lib/sw-idle";
import {
  fetchPublishedAppVersion,
  isServiceWorkerUpdateReady,
  primeServiceWorkerScript,
  versionsDiffer,
} from "@/lib/sw-update";

const UPDATE_POLL_MS = 4 * 60 * 1000;
const IDLE_RELOAD_POLL_MS = 2000;

function skipWaitingWorker(worker: ServiceWorker) {
  worker.postMessage({ type: "SKIP_WAITING" });
}

function promoteWaitingWorker(
  registration: ServiceWorkerRegistration,
  onVersionBump: () => void,
) {
  if (!registration.waiting || !navigator.serviceWorker.controller) return false;
  onVersionBump();
  skipWaitingWorker(registration.waiting);
  return true;
}

function watchForUpdate(registration: ServiceWorkerRegistration) {
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (
        isServiceWorkerUpdateReady(worker.state, Boolean(navigator.serviceWorker.controller))
      ) {
        skipWaitingWorker(worker);
      }
    });
  });
}

async function checkForAppUpdate(
  registration: ServiceWorkerRegistration,
  onVersionBump: () => void,
) {
  try {
    await registration.update();
  } catch {
    /* offline / throttled */
  }

  const published = await fetchPublishedAppVersion();
  const versionBump = Boolean(published && versionsDiffer(appVersion(), published));
  if (!versionBump) return;

  onVersionBump();
  await primeServiceWorkerScript(published!);
  try {
    await registration.update();
  } catch {
    /* offline / throttled */
  }

  promoteWaitingWorker(registration, onVersionBump);
}

function requestShellPrecache(registration: ServiceWorkerRegistration) {
  const worker = registration.active ?? registration.waiting ?? registration.installing;
  worker?.postMessage({ type: "PRECACHE_SHELL" });
}

/** Register SW; reload when app-version.txt differs (defer if user is mid-form). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let reloaded = false;
    let pendingVersionReload = false;
    let pollId: number | undefined;
    let idlePollId: number | undefined;

    const markVersionReload = () => {
      pendingVersionReload = true;
    };

    const tryReload = () => {
      if (!pendingVersionReload || reloaded || cancelled) return;
      if (isUserMidInteraction()) return;
      reloaded = true;
      window.location.reload();
    };

    const onControllerChange = () => {
      tryReload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const runUpdateCheck = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      void navigator.serviceWorker
        .getRegistration("/")
        .then((registration) => {
          if (!registration || cancelled) return;
          return checkForAppUpdate(registration, markVersionReload);
        })
        .then(() => {
          if (!cancelled) postMapTileCacheConfig();
        });
    };

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async (registration) => {
        if (cancelled) return;
        watchForUpdate(registration);
        promoteWaitingWorker(registration, markVersionReload);
        await checkForAppUpdate(registration, markVersionReload);
        requestShellPrecache(registration);
        postMapTileCacheConfig();
      })
      .catch(() => {
        /* offline / blocked — map still works without SW */
      });

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      runUpdateCheck();
      tryReload();
    };

    const onOnline = () => {
      runUpdateCheck();
      tryReload();
    };
    const onFocus = () => {
      runUpdateCheck();
      tryReload();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    pollId = window.setInterval(runUpdateCheck, UPDATE_POLL_MS);
    idlePollId = window.setInterval(tryReload, IDLE_RELOAD_POLL_MS);

    return () => {
      cancelled = true;
      if (pollId !== undefined) window.clearInterval(pollId);
      if (idlePollId !== undefined) window.clearInterval(idlePollId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
