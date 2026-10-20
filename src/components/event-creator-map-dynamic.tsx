"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function MapShell({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-[#1a1024] text-sm text-white/50",
        className,
      )}
      aria-hidden
    >
      טוען מפה…
    </div>
  );
}

const EventCreatorMapLazy = dynamic(
  () => import("@/components/event-creator-map").then((m) => m.EventCreatorMap),
  { ssr: false, loading: () => <MapShell /> },
);

export function EventCreatorMapDynamic(props: ComponentProps<typeof EventCreatorMapLazy>) {
  return <EventCreatorMapLazy {...props} />;
}
