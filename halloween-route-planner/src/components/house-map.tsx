"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { MapPin } from "lucide-react";
import type { House } from "@/lib/types";
import { cn, isHouseOpenNow } from "@/lib/utils";

const Map = dynamic(() => import("react-map-gl").then((mod) => mod.Map), {
  ssr: false,
});

const Marker = dynamic(
  () => import("react-map-gl").then((mod) => mod.Marker),
  { ssr: false },
);

type HouseMapProps = {
  houses: House[];
  onSelect: (house: House) => void;
  selectedId?: string;
};

const candyColors: Record<string, string> = {
  green: "from-emerald-400 to-emerald-600",
  yellow: "from-amber-300 to-amber-500",
  red: "from-rose-400 to-rose-600",
};

export function HouseMap({ houses, onSelect, selectedId }: HouseMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [hovered, setHovered] = useState<string>();

  const center = useMemo(() => {
    if (!houses.length) {
      return { longitude: 34.833, latitude: 32.088, zoom: 8 };
    }
    const avgLat =
      houses.reduce((acc, house) => acc + house.latitude, 0) / houses.length;
    const avgLng =
      houses.reduce((acc, house) => acc + house.longitude, 0) / houses.length;
    return { longitude: avgLng, latitude: avgLat, zoom: 10 };
  }, [houses]);

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-slate-200/70">
        יש להגדיר משתנה סביבת NEXT_PUBLIC_MAPBOX_TOKEN כדי להציג את המפה. בינתיים
        ניתן לצפות ברשימת הבתים.
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden rounded-3xl border border-white/10">
      <Map
        mapboxAccessToken={token}
        initialViewState={center}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        attributionControl={false}
      >
        {houses.map((house) => {
          const isSelected = selectedId === house.id;
          const isHovered = hovered === house.id;
          return (
            <Marker
              key={house.id}
              longitude={house.longitude}
              latitude={house.latitude}
              onClick={(event) => {
                event.originalEvent.stopPropagation();
                onSelect(house);
              }}
              anchor="bottom"
            >
              <button
                type="button"
                className={cn(
                  "group relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/40 bg-gradient-to-b shadow-[0_12px_30px_rgba(255,107,206,0.35)] transition-transform",
                  candyColors[house.candyLevel],
                  isSelected || isHovered ? "scale-110" : "scale-95",
                )}
                onMouseEnter={() => setHovered(house.id)}
                onMouseLeave={() => setHovered(undefined)}
              >
                <MapPin className="h-5 w-5 text-white drop-shadow-lg" />
                {(isSelected || isHovered) && (
                  <div className="absolute bottom-full mb-3 flex w-48 flex-col gap-2 rounded-2xl border border-white/10 bg-black/80 p-3 text-start text-xs text-white/90 backdrop-blur">
                    <div className="flex items-center gap-2">
                      <Image
                        src={
                          house.imageUrl && !house.defaultImage
                            ? house.imageUrl
                            : "/haunted-house-placeholder.svg"
                        }
                        alt={house.title}
                        width={42}
                        height={32}
                        className="h-12 w-14 rounded-xl object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold">{house.title}</p>
                        <p className="text-[11px] text-slate-300">
                          {house.address}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className={cn(
                          "rounded-full px-2 py-1",
                          isHouseOpenNow(house)
                            ? "bg-emerald-400/20 text-emerald-200"
                            : "bg-amber-400/20 text-amber-100",
                        )}
                      >
                        {isHouseOpenNow(house) ? "פתוח עכשיו" : "לא זמין כרגע"}
                      </span>
                      <span className="text-slate-200/80">
                        קישוטים {house.decorationVotes}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
