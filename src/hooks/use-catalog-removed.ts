"use client";

import { useEffect, useState } from "react";
import { isCatalogRemoved } from "@/lib/catalog-removed";

export function useCatalogRemoved(houseId: string | undefined) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener("hw-catalog-refreshed", bump);
    window.addEventListener("hw-catalog-changed", bump);
    window.addEventListener("hw-catalog-removed-changed", bump);
    return () => {
      window.removeEventListener("hw-catalog-refreshed", bump);
      window.removeEventListener("hw-catalog-changed", bump);
      window.removeEventListener("hw-catalog-removed-changed", bump);
    };
  }, []);

  if (!houseId) return false;
  void revision;
  return isCatalogRemoved(houseId);
}
