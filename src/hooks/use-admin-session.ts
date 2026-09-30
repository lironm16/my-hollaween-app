"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resetManagerClientSettings } from "@/lib/admin-client-reset";
import { notifyCatalogChanged } from "@/lib/offline-db";

const ADMIN_CHANGED_EVENT = "hw-admin-changed";

export function notifyAdminChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_CHANGED_EVENT));
}

export function useAdminSession() {
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [userPreview, setUserPreview] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const data = (await res.json()) as { admin?: boolean; userPreview?: boolean };
      const isAdmin = Boolean(data.admin);
      setAdmin(isAdmin);
      setUserPreview(isAdmin && Boolean(data.userPreview));
      return isAdmin;
    } catch {
      setAdmin(false);
      setUserPreview(false);
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

  const effectiveAdmin = admin && !userPreview;

  const setUserPreviewMode = useCallback(async (enabled: boolean) => {
    if (!admin) return false;
    try {
      const res = await fetch("/api/admin/user-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { userPreview?: boolean };
      setUserPreview(Boolean(data.userPreview));
      notifyCatalogChanged();
      notifyAdminChanged();
      return true;
    } catch {
      return false;
    }
  }, [admin]);

  const logout = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    resetManagerClientSettings();
    setAdmin(false);
    setUserPreview(false);
    notifyCatalogChanged();
    notifyAdminChanged();
  }, []);

  return useMemo(
    () => ({
      ready,
      admin,
      userPreview,
      effectiveAdmin,
      refresh,
      logout,
      setUserPreviewMode,
    }),
    [ready, admin, userPreview, effectiveAdmin, refresh, logout, setUserPreviewMode],
  );
}
