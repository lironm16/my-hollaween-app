"use client";

import { useEffect } from "react";
import { config } from "@/lib/config";

const INTERVAL_MS = 2200;

export function TabTitleCycle() {
  useEffect(() => {
    const words = config.titleWords;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.title = config.brandEn;
      return;
    }

    let index = 0;
    document.title = words[0];
    const timer = window.setInterval(() => {
      index = (index + 1) % words.length;
      document.title = words[index];
    }, INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      document.title = config.brandEn;
    };
  }, []);

  return null;
}
