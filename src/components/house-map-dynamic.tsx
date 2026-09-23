"use client";

import dynamic from "next/dynamic";
import { useEffect, type ComponentProps } from "react";

/** Dark map shell — no loading text; pins appear as soon as the chunk loads. */
function MapShell() {
  return (
    <div
      className="h-full min-h-[280px] w-full bg-[#1a1024]"
      style={{ height: "100%", minHeight: 280, background: "#1a1024" }}
      aria-hidden
    />
  );
}

const HouseMapLazy = dynamic(
  () => import("@/components/house-map").then((m) => m.HouseMap),
  { ssr: false, loading: MapShell },
);

export function HouseMapDynamic(props: ComponentProps<typeof HouseMapLazy>) {
  useEffect(() => {
    if (props.active === false) return;
    void import("@/components/house-map");
  }, [props.active]);
  return <HouseMapLazy {...props} />;
}
