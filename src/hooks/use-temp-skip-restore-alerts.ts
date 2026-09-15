"use client";

import { useEffect, useState } from "react";
import {
  emitTempSkipRestoreAlert,
  TEMP_SKIP_RESTORE_EVENT,
  type TempSkipRestoreAlert,
} from "@/lib/temp-skip-restore-alerts";

export { emitTempSkipRestoreAlert };

export function useTempSkipRestoreAlerts() {
  const [alerts, setAlerts] = useState<TempSkipRestoreAlert[]>([]);

  useEffect(() => {
    function onRestore(event: Event) {
      const detail = (event as CustomEvent<TempSkipRestoreAlert>).detail;
      if (!detail?.id || !detail.message) return;
      setAlerts((prev) => (prev.some((item) => item.id === detail.id) ? prev : [...prev, detail]));
    }
    window.addEventListener(TEMP_SKIP_RESTORE_EVENT, onRestore);
    return () => window.removeEventListener(TEMP_SKIP_RESTORE_EVENT, onRestore);
  }, []);

  useEffect(() => {
    if (alerts.length === 0) return;
    const timer = window.setTimeout(() => setAlerts([]), 8000);
    return () => window.clearTimeout(timer);
  }, [alerts]);

  function dismiss(id: string) {
    setAlerts((prev) => prev.filter((item) => item.id !== id));
  }

  return { alerts, dismiss };
}
