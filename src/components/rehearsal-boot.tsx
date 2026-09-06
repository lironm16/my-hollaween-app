"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { applyClockSearchParams } from "@/lib/app-clock";

/** Apply ?rehearsal=open and ?server=down from the URL. */
export function RehearsalBoot() {
  const search = useSearchParams();
  useEffect(() => {
    applyClockSearchParams(search);
  }, [search]);
  return null;
}
