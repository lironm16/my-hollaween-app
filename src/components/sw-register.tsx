"use client";

import { useEffect } from "react";
import { refreshPushSubscriptionIfEnabled } from "@/lib/push-client";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        void registration.update();
        return refreshPushSubscriptionIfEnabled();
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
