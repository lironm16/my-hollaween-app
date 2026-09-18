"use client";

import Link from "next/link";
import { HousePlus } from "lucide-react";

export function MapAddHouseFab() {
  return (
    <Link
      href="/add"
      className="map-add-house-fab inline-flex size-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-orange-300/50 hover:bg-orange-400"
      aria-label="הוספת בית"
      title="הוספת בית"
    >
      <HousePlus className="size-8" strokeWidth={2.25} aria-hidden />
    </Link>
  );
}
