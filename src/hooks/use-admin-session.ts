"use client";

import { useCallback, useEffect, useState } from "react";

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
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAdmin(false);
  }, []);

  return { ready, admin, refresh, logout };
}
