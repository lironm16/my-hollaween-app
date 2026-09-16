"use client";

import { useLayoutEffect } from "react";
import { applyClockSearchParams } from "@/lib/app-clock";
import { bootstrapPreviewDeploy } from "@/lib/preview-deploy";

/** Apply ?rehearsal=open, preview defaults, and ?server=down from the URL. */
export function RehearsalBoot() {
  useLayoutEffect(() => {
    bootstrapPreviewDeploy();
    applyClockSearchParams(window.location.search);
  }, []);
  return null;
}
