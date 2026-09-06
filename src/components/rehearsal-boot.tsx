"use client";

import { useEffect } from "react";
import { applyClockSearchParams } from "@/lib/app-clock";

/** Apply ?rehearsal=open and ?server=down from the URL without suspending the tree. */
export function RehearsalBoot() {
  useEffect(() => {
    applyClockSearchParams(window.location.search);
  }, []);
  return null;
}
