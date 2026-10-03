"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { isAndroidDevice, isStandaloneDisplay } from "@/lib/push-client";

const HINT_KEY = "hw-android-browser-hint-v2";

/**
 * Block Chrome install prompts on Android — WebAPK install triggers Play Protect on new Android.
 * Service worker + offline still work in a normal Chrome tab.
 */
export function AndroidInstallGuard() {
  useEffect(() => {
    if (!isAndroidDevice()) return;

    try {
      if (!localStorage.getItem(HINT_KEY)) {
        localStorage.setItem(HINT_KEY, "1");
        const inLegacyWebApk = isStandaloneDisplay();
        toast.message(
          inLegacyWebApk
            ? "אם Google חוסם את האפליקציה — הסירו את HallowHood מההגדרות ופתחו שוב ב-Chrome (בלי «התקנת אפל»)."
            : "באנדרואיד חדש עדיף ב-Chrome בלי «התקנת אפל» — המפה, GPS והתראות עובדים גם כך.",
          { duration: 9000 },
        );
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
