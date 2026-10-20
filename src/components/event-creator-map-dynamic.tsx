"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

function MapShell() {
  return (
    <div
      className="flex h-[min(52vh,420px)] w-full items-center justify-center rounded-xl border border-white/10 bg-[#1a1024] text-sm text-white/50"
      aria-hidden
    >
      טוען מפה…
    </div>
  );
}

const EventCreatorMapLazy = dynamic(
  () => import("@/components/event-creator-map").then((m) => m.EventCreatorMap),
  { ssr: false, loading: MapShell },
);

export function EventCreatorMapDynamic(props: ComponentProps<typeof EventCreatorMapLazy>) {
  return <EventCreatorMapLazy {...props} />;
}
