"use client";

import { useEffect, useState } from "react";
import {
  isHouseEditAccessRevoked,
  loadRevokedEditAccessHouseIds,
} from "@/lib/offline-db";

/** Houses whose saved edit code / pass was invalidated (e.g. owner reset the key). */
export function useEditAccessRevoked() {
  const [revokedIds, setRevokedIds] = useState(() => loadRevokedEditAccessHouseIds());

  useEffect(() => {
    const read = () => setRevokedIds(loadRevokedEditAccessHouseIds());
    window.addEventListener("hw-edit-access-changed", read);
    window.addEventListener("hw-owned-changed", read);
    return () => {
      window.removeEventListener("hw-edit-access-changed", read);
      window.removeEventListener("hw-owned-changed", read);
    };
  }, []);

  return {
    revokedIds,
    isRevoked: (houseId: string) => isHouseEditAccessRevoked(houseId, revokedIds),
  };
}
