"use client";

import dynamic from "next/dynamic";

export const HouseMapDynamic = dynamic(
  () => import("@/components/house-map").then((m) => m.HouseMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full min-h-[280px] w-full items-center justify-center bg-[#1a1024] text-orange-200"
        style={{
          display: "flex",
          height: "100%",
          minHeight: 280,
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1024",
          color: "#fed7aa",
        }}
      >
        טוענים את המפה…
      </div>
    ),
  },
);
