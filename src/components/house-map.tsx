"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { config } from "@/lib/config";
import type { PublicHouse } from "@/lib/types";
import { scareShort } from "@/lib/labels";

function pinIcon(soldOut: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="pumpkin-pin ${soldOut ? "is-soldout" : ""}"><span>${soldOut ? "🕸️" : "🎃"}</span></div>`,
    iconSize: [40, 44],
    iconAnchor: [20, 42],
    popupAnchor: [0, -36],
  });
}

const pickIcon = L.divIcon({
  className: "",
  html: `<div class="pumpkin-pin is-pick"><span>📍</span></div>`,
  iconSize: [40, 44],
  iconAnchor: [20, 42],
});

function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 60);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

function ClickCatcher({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 17), { duration: 0.4 });
  }, [lat, lng, map]);
  return null;
}

type Props = {
  houses?: PublicHouse[];
  selectedId?: string | null;
  onSelect?: (house: PublicHouse) => void;
  pickMode?: boolean;
  pick?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
};

export function HouseMap({
  houses = [],
  selectedId,
  onSelect,
  pickMode,
  pick,
  onPick,
  className,
}: Props) {
  const bounds = useMemo(
    () =>
      L.latLngBounds(
        [config.map.bounds.south, config.map.bounds.west],
        [config.map.bounds.north, config.map.bounds.east],
      ),
    [],
  );
  const selected = houses.find((h) => h.id === selectedId);

  return (
    <div className={className ?? "h-full min-h-[280px] w-full"} dir="ltr">
      <MapContainer
        center={[config.map.center.lat, config.map.center.lng]}
        zoom={config.map.zoom}
        minZoom={config.map.minZoom}
        maxZoom={config.map.maxZoom}
        maxBounds={bounds}
        maxBoundsViscosity={1}
        scrollWheelZoom
        className="h-full w-full rounded-none bg-[#1a1024]"
      >
        <TileLayer
          attribution={config.tiles.attribution}
          url={config.tiles.url}
        />
        <ResizeFix />
        {pickMode && onPick ? <ClickCatcher onPick={onPick} /> : null}
        {pickMode && pick ? (
          <>
            <Marker position={[pick.lat, pick.lng]} icon={pickIcon} />
            <FlyTo lat={pick.lat} lng={pick.lng} />
          </>
        ) : null}
        {!pickMode &&
          houses.map((house) => (
            <Marker
              key={house.id}
              position={[house.lat, house.lng]}
              icon={pinIcon(house.soldOut)}
              eventHandlers={{
                click: () => onSelect?.(house),
              }}
            >
              <Popup>
                <div dir="rtl" className="min-w-[160px] text-right">
                  <strong>{house.name}</strong>
                  <div>{house.address}</div>
                  <div>
                    {scareShort[house.scareLevel]} · {house.openFrom}–{house.openTo}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        {selected ? <FlyTo lat={selected.lat} lng={selected.lng} /> : null}
      </MapContainer>
    </div>
  );
}
