"use client";

import { useCallback, useEffect, useState } from "react";
import { readApiJson } from "@/lib/api-json";
import type { House } from "@/lib/types";

/** Lazy-load rehearsal stubs — only when admin toggles stubs / all. */
export function useAdminStubs(enabled: boolean) {
  const [stubHouses, setStubHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) {
      setStubHouses([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stubs", { cache: "no-store" });
      if (!res.ok) return;
      const data = await readApiJson<{ houses?: House[] }>(res);
      setStubHouses(data.houses ?? []);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChanged = () => void load();
    window.addEventListener("hw-catalog-changed", onChanged);
    return () => window.removeEventListener("hw-catalog-changed", onChanged);
  }, [load]);

  return { stubHouses, loading, reload: load };
}
