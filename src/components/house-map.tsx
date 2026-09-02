"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
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
import { houseHeadline, themeEmoji } from "@/lib/labels";
import { effectiveVisit, isFrozen } from "@/lib/house-state";
import { cn } from "@/lib/utils";

function pinIcon(house: PublicHouse) {
  const frozen = isFrozen(house);
  const visit = effectiveVisit(house);
  const kind = frozen
    ? "frozen"
    : house.status === "pending"
      ? "pending"
      : visit === "closed"
        ? "closed"
        : visit === "decorOnly"
          ? "decor"
          : "ok";
  const emoji =
    kind === "pending" ? "👻" : kind === "closed" ? "🕸️" : kind === "frozen" ? "😶" : themeEmoji[house.theme ?? "pumpkin"];
  return L.divIcon({
    className: "",
    html: `<div class="pumpkin-pin is-${kind}"><span>${emoji}</span></div>`,
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
    const container = map.getContainer();
    const invalidate = () => {
      map.invalidateSize({ animate: false });
    };
    const id = window.setTimeout(invalidate, 0);
    const ro = new ResizeObserver(() => invalidate());
    ro.observe(container);
    const parent = container.parentElement;
    if (parent) ro.observe(parent);
    window.addEventListener("orientationchange", invalidate);
    window.addEventListener("resize", invalidate);
    return () => {
      window.clearTimeout(id);
      ro.disconnect();
      window.removeEventListener("orientationchange", invalidate);
      window.removeEventListener("resize", invalidate);
    };
  }, [map]);
  return null;
}

function VisibilityFix({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => map.invalidateSize({ animate: false }), 40);
    return () => window.clearTimeout(id);
  }, [active, map]);
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

function FlyIfNeeded({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().contains([lat, lng])) {
      map.panTo([lat, lng]);
    }
  }, [lat, lng, map]);
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.45 });
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
  active?: boolean;
};

export function HouseMap({
  houses = [],
  selectedId,
  onSelect,
  pickMode,
  pick,
  onPick,
  className,
  active = true,
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
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!ready) {
    return (
      <div
        className={cn(
          "relative z-0 isolate flex items-center justify-center overflow-hidden bg-[#1a1024] text-orange-200",
          className ?? "h-full min-h-[280px] w-full",
        )}
      >
        טוענים את המפה…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative z-0 isolate overflow-hidden",
        className ?? "h-full min-h-[280px] w-full",
      )}
      dir="ltr"
    >
      <MapContainer
        key={pickMode ? "pick" : "view"}
        center={[config.map.center.lat, config.map.center.lng]}
        zoom={config.map.zoom}
        minZoom={config.map.minZoom}
        maxZoom={config.map.maxZoom}
        maxBounds={bounds}
        maxBoundsViscosity={1}
        scrollWheelZoom
        className={cn(
          "h-full w-full rounded-none bg-[#1a1024]",
          config.tiles.invert && "is-osm-dark",
        )}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution={config.tiles.attribution}
          url={config.tiles.url}
        />
        <ResizeFix />
        <VisibilityFix active={active} />
        {pickMode && onPick ? <ClickCatcher onPick={onPick} /> : null}
        {pickMode && pick ? (
          <>
            <Marker
              position={[pick.lat, pick.lng]}
              icon={pickIcon}
              draggable={Boolean(onPick)}
              eventHandlers={{
                dragend: (event) => {
                  const latlng = event.target.getLatLng();
                  onPick?.(latlng.lat, latlng.lng);
                },
              }}
            />
            <FlyIfNeeded lat={pick.lat} lng={pick.lng} />
          </>
        ) : null}
        {!pickMode &&
          houses.map((house) => (
            <Marker
              key={house.id}
              position={[house.lat, house.lng]}
              icon={pinIcon(house)}
              eventHandlers={{
                click: () => onSelect?.(house),
              }}
            >
              <Popup>
                <div dir="rtl" className="min-w-[160px] text-right">
                  <strong>{houseHeadline(house)}</strong>
                  <div>{house.address}</div>
                  {house.arrival ? <div>{house.arrival}</div> : null}
                  <div>
                    {house.openFrom}–{house.openTo}
                    {house.accessible ? " · נגיש" : ""}
                    {house.treats.includes("glutenFree") ? " · ללא גלוטן" : ""}
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
