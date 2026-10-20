"use client";

import { useCallback, useEffect, useState } from "react";
import { resetManagerClientSettings } from "@/lib/admin-client-reset";

const ADMIN_CHANGED_EVENT = "hw-admin-changed";

export function notifyAdminChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_CHANGED_EVENT));
}

export function useAdminSession(initialAdmin?: boolean) {
  const [ready, setReady] = useState(initialAdmin !== undefined);
  const [admin, setAdmin] = useState(Boolean(initialAdmin));

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const data = (await res.json()) as { admin?: boolean };
      setAdmin(Boolean(data.admin));
      return Boolean(data.admin);
    } catch {
      setAdmin(false);
      return false;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    window.addEventListener(ADMIN_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(ADMIN_CHANGED_EVENT, onChange);
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    resetManagerClientSettings();
    setAdmin(false);
    notifyAdminChanged();
  }, []);

  return { ready, admin, refresh, logout };
}
