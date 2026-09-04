"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
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
import { ROUTE_INCLUDE_ORIGIN_METERS, type LatLng } from "@/lib/route";
import { distanceMeters } from "@/lib/geo";
import { themeEmoji } from "@/lib/labels";
import { apartmentDotStatus, isDecorated, pinNightStatus } from "@/lib/house-state";
import { isClosingSoon, isOpeningSoon } from "@/lib/hours";
import { clusterHousesByAddress, type HouseCluster } from "@/lib/house-clusters";
import { cn } from "@/lib/utils";

function useMinuteTick() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const id = window.setInterval(onStoreChange, 15_000);
      return () => window.clearInterval(id);
    },
    () => Math.floor(Date.now() / 15_000),
    () => 0,
  );
}

function routeOrderIcon(order: number) {
  return L.divIcon({
    className: "route-stop-icon",
    html: `<div class="route-stop-pin" aria-label="עצירה ${order}">${order}</div>`,
    iconSize: [28, 34],
    iconAnchor: [14, 56],
  });
}

const PIN = 38;
const FAN_R = 70;

function attr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function pinStatusMark(houses: PublicHouse[]) {
  const status = pinNightStatus(houses);
  if (status === "ok") return "";
  const label =
    status === "closed"
      ? "נגמר המלאי"
      : status === "decor"
        ? "מקושט בלי ממתקים"
        : "חלק מהדירות נגמרו";
  return `<b class="pin-status is-${status}" aria-label="${label}"></b>`;
}

function hoursRingHtml(house: PublicHouse, now: Date) {
  if (isClosingSoon(house, now)) {
    return `<i class="pin-hours-ring is-closing" aria-hidden="true"></i>`;
  }
  if (isOpeningSoon(house, now)) {
    return `<i class="pin-hours-ring is-opening" aria-hidden="true"></i>`;
  }
  return "";
}

function hoursPinClass(house: PublicHouse, now: Date) {
  if (isClosingSoon(house, now)) return " is-closing-soon";
  if (isOpeningSoon(house, now)) return " is-opening-soon";
  return "";
}

function sprinklesHtml(house: PublicHouse) {
  if (!isDecorated(house)) return "";
  return `<i class="pin-sprinkles" aria-hidden="true"><i></i><i></i><i></i><i></i></i>`;
}

function aptDotsHtml(houses: PublicHouse[]) {
  const dots = houses
    .map((house) => `<i class="pin-apt-dot is-${apartmentDotStatus(house)}"></i>`)
    .join("");
  return `<span class="pin-apt-dots" aria-label="${houses.length} דירות">${dots}</span>`;
}

function housePinHtml(
  house: PublicHouse,
  now: Date,
  extras?: { selected?: boolean; houseId?: string; extraClass?: string; extraStyle?: string },
) {
  const emoji = themeEmoji[house.theme ?? "pumpkin"];
  const selectedClass = extras?.selected ? " is-selected" : "";
  const hoursClass = hoursPinClass(house, now);
  const extraClass = extras?.extraClass ? ` ${extras.extraClass}` : "";
  const idAttr = extras?.houseId ? ` data-house-id="${attr(extras.houseId)}"` : "";
  const style = extras?.extraStyle ? `${extras.extraStyle};background:#6d28d9` : "background:#6d28d9";
  const label = isClosingSoon(house, now)
    ? 'aria-label="נסגר בקרוב"'
    : isOpeningSoon(house, now)
      ? 'aria-label="נפתח בקרוב"'
      : isDecorated(house)
        ? 'aria-label="מקושט"'
        : "";
  return `<div class="house-pin${selectedClass}${hoursClass}${extraClass}" style="${style}" ${label}${idAttr}>${sprinklesHtml(house)}${hoursRingHtml(house, now)}${pinStatusMark([house])}<span>${emoji}</span></div>`;
}

function fanOffsets(count: number) {
  const spread = Math.min(96, 32 * Math.max(1, count - 1));
  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const rad = ((-spread / 2 + t * spread) * Math.PI) / 180;
    return { x: Math.sin(rad) * FAN_R, y: Math.cos(rad) * FAN_R };
  });
}

function clusterIcon(cluster: HouseCluster, selectedId: string | null | undefined, now: Date) {
  const houses = cluster.houses;
  const only = houses[0];
  const selectedHere = Boolean(selectedId && houses.some((house) => house.id === selectedId));
  const selectedClass = selectedHere ? " is-selected" : "";

  if (!only || houses.length <= 1) {
    const hoursClass = only ? hoursPinClass(only, now) : "";
    return L.divIcon({
      className: `pumpkin-pin-icon${selectedClass}${hoursClass}`,
      html: only ? housePinHtml(only, now, { selected: selectedHere }) : "",
      iconSize: [40, 44],
      iconAnchor: [20, 42],
    });
  }

  const emoji = themeEmoji[only.theme ?? "pumpkin"];
  if (!selectedHere) {
    return L.divIcon({
      className: `pumpkin-pin-icon pumpkin-pin-building${selectedClass}`,
      html: `<div class="house-pin is-building" style="background:#6d28d9" role="img" aria-label="${houses.length} דירות"><span>${emoji}</span>${aptDotsHtml(houses)}</div>`,
      iconSize: [44, 48],
      iconAnchor: [22, 44],
    });
  }

  const offsets = fanOffsets(houses.length);
  const pad = 22;
  const maxX = Math.max(...offsets.map((item) => Math.abs(item.x)));
  const width = Math.ceil(Math.max(44, 2 * (maxX + PIN / 2 + pad)));
  const height = Math.ceil(FAN_R + PIN / 2 + PIN + 8);
  const cx = width / 2;
  const lines = offsets
    .map((item) => {
      const x2 = cx + item.x;
      const y2 = height - item.y;
      return `<line x1="${cx}" y1="${height - PIN / 2}" x2="${x2}" y2="${y2}" />`;
    })
    .join("");
  const apts = houses
    .map((house, index) => {
      const { x, y } = offsets[index]!;
      const left = cx + x - PIN / 2;
      const bottom = y - PIN / 2;
      return housePinHtml(house, now, {
        selected: house.id === selectedId,
        houseId: house.id,
        extraClass: "is-apt",
        extraStyle: `left:${left}px;bottom:${bottom}px;z-index:${house.id === selectedId ? houses.length + 2 : index + 1}`,
      });
    })
    .join("");
  return L.divIcon({
    className: `pumpkin-pin-icon pumpkin-pin-fan${selectedClass}`,
    html: `<div class="house-pin-fan" dir="ltr" style="width:${width}px;height:${height}px"><svg class="pin-fan-lines" aria-hidden="true" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${lines}</svg><div class="house-pin is-base is-building" style="background:#6d28d9" aria-hidden="true"><span>${emoji}</span>${aptDotsHtml(houses)}</div>${apts}</div>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
  });
}

const pickIcon = L.divIcon({
  className: "pumpkin-pin-icon",
  html: `<div class="house-pin is-pick" style="background:#6d28d9"><span>📍</span></div>`,
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

/** One-shot size sync only — never pans/zooms the map. */
function SizeSync({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => map.invalidateSize({ animate: false }), 40);
    return () => window.clearTimeout(id);
  }, [active, map]);
  return null;
}

/**
 * After a pin tap, pan so the house stays in the map above the detail sheet.
 * Does not fly to GPS, filters, or the route.
 */
function KeepSelectedVisible({
  lat,
  lng,
  active,
}: {
  lat: number;
  lng: number;
  active: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const pan = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--map-sheet-h");
      const sheetH = Number.parseFloat(raw);
      if (!Number.isFinite(sheetH) || sheetH < 80) return;
      const size = map.getSize();
      const visibleMidY = Math.max(56, (size.y - sheetH) / 2);
      const point = map.latLngToContainerPoint(L.latLng(lat, lng));
      const dx = point.x - size.x / 2;
      const dy = point.y - visibleMidY;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      map.panBy([dx, dy], { animate: true, duration: 0.28 });
    };
    const onSheet = () => pan();
    const timer = window.setTimeout(pan, 70);
    window.addEventListener("hw-map-sheet", onSheet);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hw-map-sheet", onSheet);
    };
  }, [map, lat, lng, active]);
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

function ClusterMarker({
  cluster,
  selectedId,
  onSelect,
}: {
  cluster: HouseCluster;
  selectedId?: string | null;
  onSelect?: (house: PublicHouse) => void;
}) {
  const tick = useMinuteTick();
  const selectedHere = Boolean(selectedId && cluster.houses.some((h) => h.id === selectedId));
  const now = new Date(tick * 15_000);
  const closingSoon = cluster.houses.some((house) => isClosingSoon(house, now));
  const openingSoon = !closingSoon && cluster.houses.some((house) => isOpeningSoon(house, now));

  return (
    <Marker
      key={`${cluster.key}-${selectedHere ? "open" : "shut"}`}
      position={[cluster.lat, cluster.lng]}
      icon={clusterIcon(cluster, selectedId, now)}
      zIndexOffset={selectedHere ? 500 : closingSoon ? 360 : openingSoon ? 320 : cluster.houses.length > 1 ? 200 : 0}
      eventHandlers={{
        click: (event) => {
          const hit = (event.originalEvent.target as Element | null)?.closest?.("[data-house-id]");
          const id = hit?.getAttribute("data-house-id");
          const fromPin = id ? cluster.houses.find((house) => house.id === id) : undefined;
          if (fromPin) {
            onSelect?.(fromPin);
            return;
          }
          const keep = selectedId
            ? cluster.houses.find((house) => house.id === selectedId)
            : undefined;
          onSelect?.(keep ?? cluster.houses[0]);
        },
      }}
    />
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
  /** @deprecated No map movement — kept for call-site compatibility. */
  followTick?: number;
  /** @deprecated No map movement — kept for call-site compatibility. */
  fitTick?: number;
  locating?: boolean;
  onLocate?: () => void;
  routeLine?: LatLng[] | null;
  routeStops?: { id: string; order: number; lat: number; lng: number }[] | null;
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
  locating = false,
  onLocate,
  routeLine = null,
  routeStops = null,
}: Props) {
  const clusters = useMemo(
    () => (pickMode ? [] : clusterHousesByAddress(houses)),
    [houses, pickMode],
  );
  const focus = useMemo(() => {
    if (pickMode || !selectedId) return null;
    const cluster = clusters.find((item) => item.houses.some((house) => house.id === selectedId));
    if (cluster) return { lat: cluster.lat, lng: cluster.lng };
    const house = houses.find((item) => item.id === selectedId);
    return house ? { lat: house.lat, lng: house.lng } : null;
  }, [clusters, houses, pickMode, selectedId]);
  const routePositions = useMemo(
    () =>
      routeLine && routeLine.length >= 2
        ? routeLine.map((point) => [point.lat, point.lng] as [number, number])
        : null,
    [routeLine],
  );
  const approachPositions = useMemo(() => {
    const first = routeStops?.[0];
    if (!userLocation || !first) return null;
    if (distanceMeters(userLocation, first) <= ROUTE_INCLUDE_ORIGIN_METERS) return null;
    return [
      [userLocation.lat, userLocation.lng] as [number, number],
      [first.lat, first.lng] as [number, number],
    ];
  }, [userLocation, routeStops]);
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
        <SizeSync active={active} />
        {focus ? <KeepSelectedVisible lat={focus.lat} lng={focus.lng} active={active} /> : null}
        {pickMode && onPick ? <ClickCatcher onPick={onPick} /> : null}
        {pickMode && pick ? (
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
        ) : null}
        {!pickMode && approachPositions ? (
          <Polyline
            positions={approachPositions}
            pathOptions={{
              color: "#fdba74",
              weight: 3,
              opacity: 0.7,
              dashArray: "7 8",
            }}
            interactive={false}
          />
        ) : null}
        {!pickMode && routePositions ? (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#f97316",
              weight: 4,
              opacity: 0.9,
            }}
            interactive={false}
          />
        ) : null}
        {!pickMode &&
          routeStops?.map((stop) => (
            <Marker
              key={`route-${stop.id}`}
              position={[stop.lat, stop.lng]}
              icon={routeOrderIcon(stop.order)}
              zIndexOffset={600}
              interactive={false}
              keyboard={false}
            />
          ))}
        {!pickMode &&
          clusters.map((cluster) => (
            <ClusterMarker
              key={cluster.key}
              cluster={cluster}
              selectedId={selectedId}
              onSelect={onSelect}
            />
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
              <Popup autoPan={false} keepInView={false}>
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
      </MapContainer>
      {onLocate && !pickMode ? (
        <button
          type="button"
          className="locate-me absolute right-3 z-[1100] flex size-11 items-center justify-center rounded-full bg-[#1d1028] text-sky-300 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-sky-400/40"
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
