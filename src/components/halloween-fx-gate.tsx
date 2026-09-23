"use client";

import { usePathname } from "next/navigation";
import { HalloweenFx } from "@/components/halloween-fx";

/** Decorative bats/moon only on the home map shell — not add/settings/help routes. */
export function HalloweenFxGate() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return <HalloweenFx />;
}
