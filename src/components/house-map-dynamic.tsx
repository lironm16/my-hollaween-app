"use client";

import dynamic from "next/dynamic";

export const HouseMapDynamic = dynamic(
  () => import("@/components/house-map").then((m) => m.HouseMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center bg-[#1a1024] text-orange-200">
        טוענים את המפה…
      </div>
    ),
  },
);
