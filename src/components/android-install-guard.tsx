"use client";

import { useEffect } from "react";

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

/** Block Chrome's install banner on Android — WebAPK install triggers Play Protect. */
export function AndroidInstallGuard() {
  useEffect(() => {
    if (!isAndroid()) return;

    const blockInstallPrompt = (event: Event) => {
      event.preventDefault();
    };
    window.addEventListener("beforeinstallprompt", blockInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", blockInstallPrompt);
  }, []);

  return null;
}
