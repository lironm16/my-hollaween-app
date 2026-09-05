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
import { MapLegend } from "@/components/map-legend";
import "leaflet/dist/leaflet.css";
import { config, inNeighborhood } from "@/lib/config";
import type { UserLocation } from "@/hooks/use-user-location";
import type { PublicHouse } from "@/lib/types";
import { ROUTE_INCLUDE_ORIGIN_METERS, type LatLng } from "@/lib/route";
import { distanceMeters } from "@/lib/geo";
import { candyPinDot, effectiveVisit, isDecorated } from "@/lib/house-state";
import { isClosingSoon, isOnBreak, isOpeningSoon } from "@/lib/hours";
import type { ScareLevel } from "@/lib/types";
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

const ROUTE_BADGE_H = 32;

function routeBadgeHtml(order: number) {
  return `<span class="route-stop-pin" aria-label="עצירה ${order}"><b class="route-stop-num">${order}</b></span>`;
}

function wrapRoutePin(html: string, routeOrder?: number) {
  if (!routeOrder) return { html, extraH: 0 };
  return {
    extraH: ROUTE_BADGE_H,
    html: `<div class="house-pin-route">${routeBadgeHtml(routeOrder)}${html}</div>`,
  };
}

const PIN = 38;
const FAN_R = 70;

function attr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

const SCARE_SRC: Record<ScareLevel, string> = {
  mild: "/icons/pin-scare-mild.png",
  medium: "/icons/pin-scare-medium.png",
  spicy: "/icons/pin-scare-spicy.png",
};

function pinVisitKind(house: PublicHouse, now: Date): "closed" | "break" | null {
  if (effectiveVisit(house) === "closed") return "closed";
  if (isOnBreak(house, now)) return "break";
  return null;
}

function pinFaceKind(house: PublicHouse): "bare" | "scare" {
  return isDecorated(house) ? "scare" : "bare";
}

function pinStatusMark(house: PublicHouse, now: Date) {
  const visit = pinVisitKind(house, now);
  if (visit === "closed") {
    return `<b class="pin-status is-closed" aria-label="סגור"></b>`;
  }
  if (visit === "break") {
    return `<b class="pin-status is-break" aria-label="הפסקה"></b>`;
  }
  const dot = candyPinDot(house);
  if (!dot) return "";
  const label = dot === "low" ? "מעט ממתקים" : dot === "out" ? "נגמרו הממתקים" : "יש ממתקים";
  return `<b class="pin-status is-${dot}" aria-label="${label}"></b>`;
}

function hoursRingHtml(house: PublicHouse, now: Date) {
  if (pinVisitKind(house, now)) return "";
  if (isClosingSoon(house, now)) {
    return `<i class="pin-hours-ring is-closing" aria-hidden="true"></i>`;
  }
  if (isOpeningSoon(house, now)) {
    return `<i class="pin-hours-ring is-opening" aria-hidden="true"></i>`;
  }
  return "";
}

function hoursPinClass(house: PublicHouse, now: Date) {
  if (pinVisitKind(house, now)) return "";
  if (isClosingSoon(house, now)) return " is-closing-soon";
  if (isOpeningSoon(house, now)) return " is-opening-soon";
  return "";
}

function pinFaceHtml(house: PublicHouse) {
  const src = SCARE_SRC[pinFaceKind(house) === "scare" ? (house.scareLevel ?? "mild") : "mild"];
  return `<img class="pin-scare" src="${src}" alt="" />`;
}

function housePinHtml(
  house: PublicHouse,
  now: Date,
  extras?: { selected?: boolean; houseId?: string; extraClass?: string; extraStyle?: string },
) {
  const selectedClass = extras?.selected ? " is-selected" : "";
  const hoursClass = hoursPinClass(house, now);
  const face = pinFaceKind(house);
  const visit = pinVisitKind(house, now);
  const bareClass = face === "bare" ? " is-undecorated" : "";
  const extraClass = extras?.extraClass ? ` ${extras.extraClass}` : "";
  const idAttr = extras?.houseId ? ` data-house-id="${attr(extras.houseId)}"` : "";
  const fill = face === "bare" ? "#94a3b8" : "#6d28d9";
  const style = extras?.extraStyle ? `${extras.extraStyle};background:${fill}` : `background:${fill}`;
  const label =
    visit === "closed"
      ? 'aria-label="סגור"'
      : visit === "break"
        ? 'aria-label="הפסקה"'
        : isClosingSoon(house, now)
          ? 'aria-label="נסגר בקרוב"'
          : isOpeningSoon(house, now)
            ? 'aria-label="נפתח בקרוב"'
            : face === "scare"
              ? 'aria-label="מקושט"'
              : 'aria-label="לא מקושט"';
  return `<div class="house-pin${selectedClass}${hoursClass}${bareClass}${extraClass}" style="${style}" ${label}${idAttr}>${hoursRingHtml(house, now)}${pinStatusMark(house, now)}${pinFaceHtml(house)}</div>`;
}

function fanLayout(count: number) {
  const spread = count <= 4 ? Math.min(120, 38 * Math.max(1, count - 1)) : Math.min(220, 26 * (count - 1));
  const gap = PIN + 16;
  const arc = gap * Math.max(1, count - 1);
  const r = Math.max(FAN_R, arc / ((Math.max(spread, 1) * Math.PI) / 180));
  const offsets = Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const rad = ((-spread / 2 + t * spread) * Math.PI) / 180;
    return { x: Math.sin(rad) * r, y: Math.cos(rad) * r };
  });
  return { offsets, r };
}

function clusterIcon(
  cluster: HouseCluster,
  selectedId: string | null | undefined,
  now: Date,
  routeOrder?: number,
  overview?: boolean,
) {
  const houses = cluster.houses;
  const only = houses[0];
  const selectedHere = Boolean(selectedId && houses.some((house) => house.id === selectedId));
  const selectedClass = selectedHere ? " is-selected" : "";

  if (!only || houses.length <= 1) {
    const hoursClass = only ? hoursPinClass(only, now) : "";
    const wrapped = wrapRoutePin(
      only ? housePinHtml(only, now, { selected: selectedHere }) : "",
      routeOrder,
    );
    return L.divIcon({
      className: `pumpkin-pin-icon${selectedClass}${hoursClass}`,
      html: wrapped.html,
      iconSize: [40, 44 + wrapped.extraH],
      iconAnchor: [20, 42 + wrapped.extraH],
    });
  }

  if (!selectedHere) {
    const wrapped = wrapRoutePin(
      `<div class="house-pin is-building" style="background:#6d28d9" role="img" aria-label="${houses.length} דירות"><span class="pin-houses" aria-hidden="true"><i></i><i></i></span></div>`,
      routeOrder,
    );
    return L.divIcon({
      className: `pumpkin-pin-icon pumpkin-pin-building${selectedClass}`,
      html: wrapped.html,
      iconSize: [44, 48 + wrapped.extraH],
      iconAnchor: [22, 44 + wrapped.extraH],
    });
  }

  const { offsets, r } = fanLayout(houses.length);
  const pad = 22;
  const maxX = Math.max(...offsets.map((item) => Math.abs(item.x)));
  const width = Math.ceil(Math.max(44, 2 * (maxX + PIN / 2 + pad)));
  const height = Math.ceil(r + PIN / 2 + PIN + 8);
  const cx = width / 2;
  const baseY = height - PIN / 2;
  const edge = PIN / 2 + 1;
  const lines = offsets
    .map((item) => {
      const x2 = cx + item.x;
      const y2 = height - item.y;
      const dx = x2 - cx;
      const dy = y2 - baseY;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      return `<line x1="${cx + ux * edge}" y1="${baseY + uy * edge}" x2="${x2 - ux * edge}" y2="${y2 - uy * edge}" />`;
    })
    .join("");
  const apts = houses
    .map((house, index) => {
      const { x, y } = offsets[index]!;
      const left = cx + x - PIN / 2;
      const bottom = y - PIN / 2;
      return housePinHtml(house, now, {
        selected: !overview && house.id === selectedId,
        houseId: house.id,
        extraClass: "is-apt",
        extraStyle: `left:${left}px;bottom:${bottom}px;z-index:${house.id === selectedId ? houses.length + 3 : index + 2}`,
      });
    })
    .join("");
  const badge = routeOrder ? routeBadgeHtml(routeOrder) : "";
  return L.divIcon({
    className: `pumpkin-pin-icon pumpkin-pin-fan${selectedClass}`,
    html: `<div class="house-pin-fan" dir="ltr" style="width:${width}px;height:${height}px"><svg class="pin-fan-lines" aria-hidden="true" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${lines}</svg><div class="house-pin is-base is-building" style="background:#6d28d9" aria-hidden="true"><span class="pin-houses" aria-hidden="true"><i></i><i></i></span></div>${badge}${apts}</div>`,
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

/** Keep Leaflet sized to the visible viewport — never pans/zooms the map. */
function SizeSync({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const sync = () => map.invalidateSize({ animate: false });
    const id = window.setTimeout(sync, 40);
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
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

function MapDismiss({
  enabled,
  onDismiss,
}: {
  enabled: boolean;
  onDismiss?: () => void;
}) {
  useMapEvents({
    click() {
      if (enabled) onDismiss?.();
    },
  });
  return null;
}

function ClusterMarker({
  cluster,
  selectedId,
  clusterOverview,
  onSelect,
  onClose,
  routeOrder,
}: {
  cluster: HouseCluster;
  selectedId?: string | null;
  clusterOverview?: boolean;
  onSelect?: (house: PublicHouse, opts?: { clusterOverview?: boolean }) => void;
  onClose?: () => void;
  routeOrder?: number;
}) {
  const tick = useMinuteTick();
  const selectedHere = Boolean(selectedId && cluster.houses.some((h) => h.id === selectedId));
  const now = new Date(tick * 15_000);
  const closingSoon = cluster.houses.some((house) => isClosingSoon(house, now));
  const openingSoon = !closingSoon && cluster.houses.some((house) => isOpeningSoon(house, now));
  const overview = Boolean(clusterOverview && selectedHere);

  return (
    <Marker
      key={`${cluster.key}-${selectedHere ? (overview ? "peek" : selectedId ?? "open") : "shut"}-${routeOrder ?? 0}`}
      position={[cluster.lat, cluster.lng]}
      icon={clusterIcon(cluster, selectedId, now, routeOrder, overview)}
      zIndexOffset={
        selectedHere
          ? 10000
          : routeOrder
            ? 700
            : closingSoon
              ? 360
              : openingSoon
                ? 320
                : cluster.houses.length > 1
                  ? 200
                  : 0
      }
      eventHandlers={{
        click: (event) => {
          L.DomEvent.stopPropagation(event.originalEvent);
          const hit = (event.originalEvent.target as Element | null)?.closest?.("[data-house-id]");
          const id = hit?.getAttribute("data-house-id");
          const fromPin = id ? cluster.houses.find((house) => house.id === id) : undefined;
          if (fromPin) {
            onSelect?.(fromPin);
            return;
          }
          if (selectedHere && cluster.houses.length > 1) {
            onClose?.();
            return;
          }
          onSelect?.(cluster.houses[0], cluster.houses.length > 1 ? { clusterOverview: true } : undefined);
        },
      }}
    />
  );
}

type Props = {
  houses?: PublicHouse[];
  selectedId?: string | null;
  clusterOverview?: boolean;
  onSelect?: (house: PublicHouse, opts?: { clusterOverview?: boolean }) => void;
  onClose?: () => void;
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
  clusterOverview,
  onSelect,
  onClose,
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
  const routeOrderById = useMemo(() => {
    const map = new Map<string, number>();
    for (const stop of routeStops ?? []) map.set(stop.id, stop.order);
    return map;
  }, [routeStops]);
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
        {!pickMode ? (
          <MapDismiss enabled={Boolean(selectedId)} onDismiss={onClose} />
        ) : null}
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
          clusters.map((cluster) => (
            <ClusterMarker
              key={cluster.key}
              cluster={cluster}
              selectedId={selectedId}
              clusterOverview={clusterOverview}
              onSelect={onSelect}
              onClose={onClose}
              routeOrder={cluster.houses.reduce<number | undefined>(
                (found, house) => found ?? routeOrderById.get(house.id),
                undefined,
              )}
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
      {!pickMode ? (
        <div className="map-fab-stack">
          {onLocate ? (
            <button
              type="button"
              className="locate-me flex size-11 items-center justify-center rounded-full bg-[#1d1028] text-sky-300 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-sky-400/40"
              aria-label="המיקום שלי"
              title="המיקום שלי"
              onClick={onLocate}
            >
              <LocateFixed className={cn("size-5", locating && "animate-pulse")} />
            </button>
          ) : null}
          <MapLegend />
        </div>
      ) : null}
    </div>
  );
}
