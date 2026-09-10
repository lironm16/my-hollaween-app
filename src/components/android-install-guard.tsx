"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const HINT_KEY = "hw-android-browser-hint-v1";

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

/** Block Chrome's install banner on Android — WebAPK install triggers Play Protect. */
export function AndroidInstallGuard() {
  useEffect(() => {
    if (!isAndroid()) return;

    try {
      if (!localStorage.getItem(HINT_KEY)) {
        localStorage.setItem(HINT_KEY, "1");
        toast.message("עובד ישר בדפדפן — אין צורך בהתקנה באנדרואיד", { duration: 7000 });
      }
    } catch {
      /* private mode */
    }

    const blockInstallPrompt = (event: Event) => {
      event.preventDefault();
    };
    window.addEventListener("beforeinstallprompt", blockInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", blockInstallPrompt);
  }, []);

  return null;
}
