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
import { pinNightStatus } from "@/lib/house-state";
import { clusterHousesByAddress, type HouseCluster } from "@/lib/house-clusters";
import { cn } from "@/lib/utils";

function routeOrderIcon(order: number) {
  return L.divIcon({
    className: "route-stop-icon",
    html: `<div class="route-stop-pin" aria-label="עצירה ${order}">${order}</div>`,
    iconSize: [28, 34],
    iconAnchor: [14, 56],
  });
}

const PIN_DOT = 24;
/** 50% overlap: each extra apartment is offset by half a dot. */
const PIN_DOT_STEP = PIN_DOT * 0.5;

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

function pinDotHtml(
  house: PublicHouse,
  selected: boolean,
  offset?: { left: number; z: number },
) {
  const emoji = themeEmoji[house.theme ?? "pumpkin"];
  const selectedClass = selected ? " is-selected" : "";
  if (!offset) {
    return `<div class="house-pin${selectedClass}" style="background:#6d28d9">${pinStatusMark([house])}<span>${emoji}</span></div>`;
  }
  return `<div class="house-pin house-pin-dot${selectedClass}" style="background:#6d28d9;left:${offset.left}px;z-index:${offset.z}">${pinStatusMark([house])}<span>${emoji}</span></div>`;
}

function clusterIcon(cluster: HouseCluster, selectedId?: string | null) {
  const houses = cluster.houses;
  const only = houses[0];
  const selectedHere = Boolean(selectedId && houses.some((house) => house.id === selectedId));
  const selectedClass = selectedHere ? " is-selected" : "";

  if (!only || houses.length <= 1) {
    return L.divIcon({
      className: `pumpkin-pin-icon${selectedClass}`,
      html: only ? pinDotHtml(only, selectedHere) : "",
      iconSize: [40, 44],
      iconAnchor: [20, 42],
    });
  }

  const width = PIN_DOT + (houses.length - 1) * PIN_DOT_STEP;
  const height = PIN_DOT;
  const dots = houses
    .map((house, index) =>
      pinDotHtml(house, house.id === selectedId, {
        left: index * PIN_DOT_STEP,
        z: house.id === selectedId ? houses.length + 2 : index + 1,
      }),
    )
    .join("");
  return L.divIcon({
    className: `pumpkin-pin-icon pumpkin-pin-stack${selectedClass}`,
    html: `<div class="house-pin-stack" dir="ltr" role="img" aria-label="${houses.length} דירות">${dots}</div>`,
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
  const selectedHere = Boolean(selectedId && cluster.houses.some((h) => h.id === selectedId));

  return (
    <Marker
      position={[cluster.lat, cluster.lng]}
      icon={clusterIcon(cluster, selectedId)}
      zIndexOffset={selectedHere ? 500 : cluster.houses.length > 1 ? 200 : 0}
      eventHandlers={{
        click: () => {
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
