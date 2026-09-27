"use client";

import { useEffect, useState } from "react";
import type { PublicHouse } from "@/lib/types";
import { GEM_LAB_STUBS_EVENT, loadGemLabStubs } from "@/lib/gem-lab-stubs";

export function useGemLabStubs() {
  const [stubs, setStubs] = useState<PublicHouse[]>([]);

  useEffect(() => {
    const sync = () => setStubs(loadGemLabStubs());
    sync();
    window.addEventListener(GEM_LAB_STUBS_EVENT, sync);
    return () => window.removeEventListener(GEM_LAB_STUBS_EVENT, sync);
  }, []);

  return stubs;
}
