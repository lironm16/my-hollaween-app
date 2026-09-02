"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { LocateFixed } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { config, inNeighborhood } from "@/lib/config";
import type { UserLocation } from "@/hooks/use-user-location";
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

const youAreHereIcon = L.divIcon({
  className: "you-are-here-wrap",
  html: `<div class="you-are-here" aria-hidden="true"><span class="you-are-here-pulse"></span><span class="you-are-here-dot"></span></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
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

function FlyToUser({
  location,
  tick,
}: {
  location: UserLocation | null;
  tick: number;
}) {
  const map = useMap();
  const flownTick = useRef(0);
  useEffect(() => {
    if (!location || tick < 1 || tick === flownTick.current) return;
    flownTick.current = tick;
    let lat = location.lat;
    let lng = location.lng;
    if (!inNeighborhood(lat, lng)) {
      const b = config.map.bounds;
      lat = Math.min(b.north, Math.max(b.south, lat));
      lng = Math.min(b.east, Math.max(b.west, lng));
    }
    map.flyTo([lat, lng], Math.max(map.getZoom(), 17), { duration: 0.5 });
  }, [location, tick, map]);
  return null;
}

function bindPopupRoot(node: HTMLDivElement | null) {
  if (!node) return;
  L.DomEvent.disableClickPropagation(node);
  L.DomEvent.disableScrollPropagation(node);
}

function HousePreviewPopup({
  house,
  onOpenDetails,
}: {
  house: PublicHouse;
  onOpenDetails?: (house: PublicHouse) => void;
}) {
  const map = useMap();
  return (
    <Popup
      className="house-map-popup-root"
      maxWidth={260}
      minWidth={176}
      autoPan
      autoPanPadding={[48, 72]}
      closeButton
    >
      <div ref={bindPopupRoot} dir="rtl" className="house-map-popup">
        <strong>{houseHeadline(house)}</strong>
        <div className="house-map-popup-meta">{house.address}</div>
        {house.arrival ? <div className="house-map-popup-meta">{house.arrival}</div> : null}
        <div className="house-map-popup-meta">
          {house.openFrom}–{house.openTo}
          {house.accessible ? " · נגיש" : ""}
          {house.treats.includes("glutenFree") ? " · ללא גלוטן" : ""}
        </div>
        {onOpenDetails ? (
          <button
            type="button"
            className="house-map-popup-btn"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              map.closePopup();
              onOpenDetails(house);
            }}
          >
            לפרטי הבית
          </button>
        ) : null}
      </div>
    </Popup>
  );
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
  userLocation?: UserLocation | null;
  followTick?: number;
  locating?: boolean;
  onLocate?: () => void;
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
  userLocation = null,
  followTick = 0,
  locating = false,
  onLocate,
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
          key={config.tiles.url}
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
            <Marker key={house.id} position={[house.lat, house.lng]} icon={pinIcon(house)}>
              <HousePreviewPopup house={house} onOpenDetails={onSelect} />
            </Marker>
          ))}
        {!pickMode && userLocation ? (
          <>
            {userLocation.accuracy > 8 && userLocation.accuracy < 120 ? (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={userLocation.accuracy}
                pathOptions={{
                  color: "#7dd3fc",
                  fillColor: "#38bdf8",
                  fillOpacity: 0.18,
                  weight: 1,
                }}
                interactive={false}
              />
            ) : null}
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={youAreHereIcon}
              zIndexOffset={800}
            >
              <Popup>
                <div dir="rtl" className="text-right">
                  <strong>אתם כאן</strong>
                  {!inNeighborhood(userLocation.lat, userLocation.lng) ? (
                    <div>מחוץ לגבול המפה של השכונה</div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          </>
        ) : null}
        {selected ? <FlyTo lat={selected.lat} lng={selected.lng} /> : null}
        <FlyToUser location={userLocation} tick={followTick} />
      </MapContainer>
      {onLocate && !pickMode ? (
        <button
          type="button"
          className="locate-me absolute bottom-6 right-3 z-[1100] flex size-11 items-center justify-center rounded-full bg-[#1d1028] text-sky-300 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-sky-400/40 hover:bg-[#2a1638] hover:text-sky-200"
          aria-label="המיקום שלי"
          title="המיקום שלי"
          onClick={onLocate}
        >
          <LocateFixed className={cn("size-5", locating && "animate-pulse")} />
        </button>
      ) : null}
    </div>
  );
}
