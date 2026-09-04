"use client";

import { useCallback, useEffect, useState } from "react";

const ADMIN_CHANGED_EVENT = "hw-admin-changed";

export function notifyAdminChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_CHANGED_EVENT));
}

export function useAdminSession() {
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);

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
    setAdmin(false);
    notifyAdminChanged();
  }, []);

  return { ready, admin, refresh, logout };
}
