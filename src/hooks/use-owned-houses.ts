"use client";

import { useEffect, useState } from "react";
import { loadOwnedHouses, type OwnedHouse } from "@/lib/offline-db";

/** Empty on the server and on the first client paint — avoids hydration mismatches. */
export function useOwnedHouses(): OwnedHouse[] {
  const [owned, setOwned] = useState<OwnedHouse[]>([]);

  useEffect(() => {
    const read = () => setOwned(loadOwnedHouses());
    read();
    window.addEventListener("storage", read);
    window.addEventListener("hw-owned-changed", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("hw-owned-changed", read);
    };
  }, []);

  return owned;
}
