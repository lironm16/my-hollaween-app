"use client";

import { useEffect } from "react";
import { refreshPushSubscriptionIfEnabled } from "@/lib/push-client";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(() => {
      void refreshPushSubscriptionIfEnabled();
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshPushSubscriptionIfEnabled();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  return null;
}
