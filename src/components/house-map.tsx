"use client";

import { useAppNow } from "@/hooks/use-app-clock";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
import { LocateFixed, Moon, Sun } from "lucide-react";
import { MapLegend } from "@/components/map-legend";
import "leaflet/dist/leaflet.css";
import { config, inNeighborhood } from "@/lib/config";
import type { UserLocation } from "@/hooks/use-user-location";
import type { PublicHouse } from "@/lib/types";
import { type LatLng } from "@/lib/route";
import { distanceMeters } from "@/lib/geo";
import { candyPinDot, effectiveVisit, isDecorated, isOwnerFrozen } from "@/lib/house-state";
import { isClosingSoon, isHoursNightOver, isOnBreak, isOpeningSoon } from "@/lib/hours";
import type { ScareLevel } from "@/lib/types";
import { clusterHousesByAddress, type HouseCluster } from "@/lib/house-clusters";
import { cn } from "@/lib/utils";

function useMinuteTick() {
  const now = useAppNow();
  return Math.floor(now.getTime() / 15_000);
}

const MAP_THEME_KEY = "hw-map-theme";

function readMapTheme(): "dark" | "light" {
  try {
    return localStorage.getItem(MAP_THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function saveMapTheme(theme: "dark" | "light") {
  try {
    localStorage.setItem(MAP_THEME_KEY, theme);
  } catch {
    /* private mode */
  }
}

function tileUrlFor(theme: "dark" | "light") {
  if (config.tiles.invert) return config.tiles.url;
  return theme === "light" ? config.tiles.url.replace("/dark_all/", "/light_all/") : config.tiles.url;
}

const ROUTE_BADGE_H = 32;

function routeBadgeHtml(order: number) {
  return `<span class="route-stop-pin" aria-label="עצירה ${order}"><b class="route-stop-num">${order}</b></span>`;
}

function wrapRoutePin(html: string, routeOrder?: number) {
  if (!routeOrder) return { html, extraH: 0 };
  return {
    extraH: ROUTE_BADGE_H,
    html: `<div class="house-pin-route">${html}${routeBadgeHtml(routeOrder)}</div>`,
  };
}

const PIN = 46;
const FAN_R = 82;

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
  if (isHoursNightOver(house, now)) return "closed";
  if (isOwnerFrozen(house, now.getTime()) || isOnBreak(house, now)) return "break";
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

function clusterAptDotsHtml(houses: PublicHouse[], now: Date) {
  if (houses.length <= 1) return "";
  const dots = houses
    .map((house) => {
      const visit = pinVisitKind(house, now);
      if (visit === "closed") return `<i class="pin-apt-dot is-closed"></i>`;
      if (visit === "break") return `<i class="pin-apt-dot is-break"></i>`;
      const dot = candyPinDot(house) ?? "out";
      return `<i class="pin-apt-dot is-${dot}"></i>`;
    })
    .join("");
  return `<span class="pin-apt-dots" aria-hidden="true">${dots}</span>`;
}

function housePinHtml(
  house: PublicHouse,
  now: Date,
  extras?: {
    selected?: boolean;
    houseId?: string;
    extraClass?: string;
    extraStyle?: string;
    visited?: boolean;
  },
) {
  const selectedClass = extras?.selected ? " is-selected" : "";
  const hoursClass = hoursPinClass(house, now);
  const face = pinFaceKind(house);
  const visit = pinVisitKind(house, now);
  const bareClass = face === "bare" ? " is-undecorated" : "";
  const visitedClass = extras?.visited ? " is-visited" : "";
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
  return `<div class="house-pin${selectedClass}${hoursClass}${bareClass}${visitedClass}${extraClass}" style="${style}" ${label}${idAttr}>${hoursRingHtml(house, now)}${pinStatusMark(house, now)}${pinFaceHtml(house)}</div>`;
}

function fanLayout(count: number) {
  const spread = count <= 4 ? Math.min(120, PIN * Math.max(1, count - 1)) : Math.min(220, 26 * (count - 1));
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

/** Screen offset from the building pin (cluster latlng) to an inner house icon center. */
function fanPinScreenOffset(count: number, index: number) {
  if (count <= 1 || index < 0 || index >= count) return { x: 0, y: 0 };
  const { offsets } = fanLayout(count);
  const off = offsets[index];
  if (!off) return { x: 0, y: 0 };
  return { x: off.x, y: -off.y };
}

function clusterIcon(
  cluster: HouseCluster,
  selectedId: string | null | undefined,
  now: Date,
  routeOrder?: number,
  overview?: boolean,
  visitedIds: string[] = [],
) {
  const houses = cluster.houses;
  const only = houses[0];
  const selectedHere = Boolean(selectedId && houses.some((house) => house.id === selectedId));
  const selectedClass = selectedHere ? " is-selected" : "";
  const allVisited = houses.length > 0 && houses.every((house) => visitedIds.includes(house.id));

  if (!only || houses.length <= 1) {
    const hoursClass = only ? hoursPinClass(only, now) : "";
    const wrapped = wrapRoutePin(
      only
        ? housePinHtml(only, now, {
            selected: selectedHere,
            visited: visitedIds.includes(only.id),
          })
        : "",
      routeOrder,
    );
    return L.divIcon({
      className: `pumpkin-pin-icon${selectedClass}${hoursClass}`,
      html: wrapped.html,
      iconSize: [50, 54 + wrapped.extraH],
      iconAnchor: [25, 50 + wrapped.extraH],
    });
  }

  if (!selectedHere) {
    const wrapped = wrapRoutePin(
      `<div class="house-pin is-building${allVisited ? " is-visited" : ""}" style="background:#6d28d9" role="img" aria-label="${houses.length} דירות"><span class="pin-houses" aria-hidden="true"><i></i><i></i></span>${clusterAptDotsHtml(houses, now)}</div>`,
      routeOrder,
    );
    return L.divIcon({
      className: `pumpkin-pin-icon pumpkin-pin-building${selectedClass}`,
      html: wrapped.html,
      iconSize: [54, 72 + wrapped.extraH],
      iconAnchor: [27, 54 + wrapped.extraH],
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
        visited: visitedIds.includes(house.id),
        extraClass: "is-apt",
        extraStyle: `left:${left}px;bottom:${bottom}px;z-index:${house.id === selectedId ? houses.length + 3 : index + 2}`,
      });
    })
    .join("");
  const badge = routeOrder ? routeBadgeHtml(routeOrder) : "";
  return L.divIcon({
    className: `pumpkin-pin-icon pumpkin-pin-fan${selectedClass}`,
    html: `<div class="house-pin-fan" dir="ltr" style="width:${width}px;height:${height}px"><svg class="pin-fan-lines" aria-hidden="true" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${lines}</svg><div class="house-pin is-base is-building${allVisited ? " is-visited" : ""}" style="background:#6d28d9" aria-hidden="true"><span class="pin-houses" aria-hidden="true"><i></i><i></i></span>${clusterAptDotsHtml(houses, now)}</div>${apts}${badge}</div>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
  });
}

const pickIcon = L.divIcon({
  className: "pumpkin-pin-icon",
  html: `<div class="house-pin is-pick" style="background:#6d28d9"><span>📍</span></div>`,
  iconSize: [50, 54],
  iconAnchor: [25, 50],
});

const originIcon = L.divIcon({
  className: "pumpkin-pin-icon is-origin-pin",
  html: `<div class="house-pin is-origin" aria-label="נקודת התחלה"><span>📍</span></div>`,
  iconSize: [50, 54],
  iconAnchor: [25, 50],
});

const youAreHereIcon = L.divIcon({
  className: "you-are-here-wrap",
  html: `<div class="you-are-here" aria-hidden="true"><span class="you-are-here-pulse"></span><span class="you-are-here-dot"></span></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

/** Fit the walking path only after a route-button tap (tick). */
function FitRoute({
  positions,
  tick,
}: {
  positions: [number, number][] | null;
  tick: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!tick || !positions || positions.length < 2) return;
    const id = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      map.fitBounds(L.latLngBounds(positions), {
        padding: [48, 48],
        maxZoom: 17,
        animate: true,
      });
    }, 60);
    return () => window.clearTimeout(id);
  }, [map, positions, tick]);
  return null;
}

/** Keep Leaflet sized to the visible viewport — never pans/zooms the map. */
function SizeSync({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const sync = () => map.invalidateSize({ animate: false });
    const id = window.setTimeout(sync, 40);
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    ro?.observe(map.getContainer());
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      ro?.disconnect();
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
  offsetX = 0,
  offsetY = 0,
  active,
}: {
  lat: number;
  lng: number;
  offsetX?: number;
  offsetY?: number;
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
      point.x += offsetX;
      point.y += offsetY;
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
  }, [map, lat, lng, offsetX, offsetY, active]);
  return null;
}

function FollowPick({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const go = () => {
      map.invalidateSize();
      map.panTo([lat, lng], { animate: true, duration: 0.4 });
    };
    const timer = window.setTimeout(go, 60);
    return () => window.clearTimeout(timer);
  }, [map, lat, lng]);
  return null;
}

/** Pan only when the parent increments tick (locate / saved origin). Never on list↔map. */
function PanTo({
  lat,
  lng,
  tick,
}: {
  lat: number;
  lng: number;
  tick: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!tick || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const id = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      map.panTo([lat, lng], { animate: true, duration: 0.4 });
    }, 60);
    return () => window.clearTimeout(id);
  }, [map, lat, lng, tick]);
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
  visitedIds,
}: {
  cluster: HouseCluster;
  selectedId?: string | null;
  clusterOverview?: boolean;
  onSelect?: (house: PublicHouse, opts?: { clusterOverview?: boolean }) => void;
  onClose?: () => void;
  routeOrder?: number;
  visitedIds: string[];
}) {
  const tick = useMinuteTick();
  const selectedHere = Boolean(selectedId && cluster.houses.some((h) => h.id === selectedId));
  const now = new Date(tick * 15_000);
  const closingSoon = cluster.houses.some((house) => isClosingSoon(house, now));
  const openingSoon = !closingSoon && cluster.houses.some((house) => isOpeningSoon(house, now));
  const overview = Boolean(clusterOverview && selectedHere);
  const visitedKey = cluster.houses.map((house) => (visitedIds.includes(house.id) ? "1" : "0")).join("");
  const statusKey = cluster.houses
    .map((house) => pinVisitKind(house, now) ?? candyPinDot(house) ?? "x")
    .join("");

  return (
    <Marker
      key={`${cluster.key}-${selectedHere ? (overview ? "peek" : selectedId ?? "open") : "shut"}-${routeOrder ?? 0}-${visitedKey}-${statusKey}`}
      position={[cluster.lat, cluster.lng]}
      icon={clusterIcon(cluster, selectedId, now, routeOrder, overview, visitedIds)}
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
  /** Walking-route start (GPS / custom / neighborhood) for the dashed approach. */
  routeStart?: LatLng | null;
  /** Increment only on route-button tap to fit the whole path. */
  routeFitTick?: number;
  visitedIds?: string[];
  originMarker?: LatLng | null;
  originPickActive?: boolean;
  originPick?: LatLng | null;
  onOriginPick?: (lat: number, lng: number) => void;
  panTo?: LatLng | null;
  panTick?: number;
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
  routeStart = null,
  routeFitTick = 0,
  visitedIds = [],
  originMarker = null,
  originPickActive = false,
  originPick = null,
  onOriginPick,
  panTo = null,
  panTick = 0,
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
    if (!cluster) {
      const house = houses.find((item) => item.id === selectedId);
      return house ? { lat: house.lat, lng: house.lng, offsetX: 0, offsetY: 0 } : null;
    }
    const inner =
      !clusterOverview && cluster.houses.length > 1
        ? fanPinScreenOffset(
            cluster.houses.length,
            cluster.houses.findIndex((house) => house.id === selectedId),
          )
        : { x: 0, y: 0 };
    return { lat: cluster.lat, lng: cluster.lng, offsetX: inner.x, offsetY: inner.y };
  }, [clusterOverview, clusters, houses, pickMode, selectedId]);
  const routePositions = useMemo(
    () =>
      routeLine && routeLine.length >= 2
        ? routeLine.map((point) => [point.lat, point.lng] as [number, number])
        : null,
    [routeLine],
  );
  const approachPositions = useMemo(() => {
    const first = routeStops?.[0];
    const start = routeStart ?? userLocation;
    if (!start || !first) return null;
    if (distanceMeters(start, first) < 12) return null;
    return [
      [start.lat, start.lng] as [number, number],
      [first.lat, first.lng] as [number, number],
    ];
  }, [routeStart, userLocation, routeStops]);
  const fitPositions = useMemo(() => {
    const parts: [number, number][] = [];
    if (approachPositions) parts.push(...approachPositions);
    if (routePositions) parts.push(...routePositions);
    return parts.length >= 2 ? parts : null;
  }, [approachPositions, routePositions]);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [mapTheme, setMapTheme] = useState<"dark" | "light">(readMapTheme);
  const tileUrl = tileUrlFor(mapTheme);
  const osmDark = mapTheme === "dark" && config.tiles.invert;

  function toggleMapTheme() {
    setMapTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      saveMapTheme(next);
      return next;
    });
  }

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
        originPickActive && "is-origin-pick",
        osmDark && "is-osm-dark",
        mapTheme === "dark" ? "bg-[#1a1024]" : "bg-[#d6d3d1]",
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
        className="h-full w-full rounded-none"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution={config.tiles.attribution}
          url={tileUrl}
          key={tileUrl}
        />
        <SizeSync active={active} />
        {routeFitTick > 0 && fitPositions ? (
          <FitRoute positions={fitPositions} tick={routeFitTick} />
        ) : null}
        {panTick > 0 && panTo ? <PanTo lat={panTo.lat} lng={panTo.lng} tick={panTick} /> : null}
        {focus && !originPickActive ? (
          <KeepSelectedVisible
            lat={focus.lat}
            lng={focus.lng}
            offsetX={focus.offsetX}
            offsetY={focus.offsetY}
            active={active}
          />
        ) : null}
        {!pickMode && !originPickActive ? (
          <MapDismiss enabled={Boolean(selectedId)} onDismiss={onClose} />
        ) : null}
        {pickMode && pick ? <FollowPick lat={pick.lat} lng={pick.lng} /> : null}
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
        {originPickActive && originPick ? (
          <FollowPick lat={originPick.lat} lng={originPick.lng} />
        ) : null}
        {originPickActive && onOriginPick ? <ClickCatcher onPick={onOriginPick} /> : null}
        {originPickActive && originPick ? (
          <Marker
            position={[originPick.lat, originPick.lng]}
            icon={originIcon}
            draggable
            zIndexOffset={9000}
            eventHandlers={{
              dragend: (event) => {
                const latlng = event.target.getLatLng();
                onOriginPick?.(latlng.lat, latlng.lng);
              },
            }}
          />
        ) : null}
        {!originPickActive && originMarker ? (
          <Marker
            position={[originMarker.lat, originMarker.lng]}
            icon={originIcon}
            zIndexOffset={850}
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
              visitedIds={visitedIds}
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
      <div className="map-fab-stack">
          <button
            type="button"
            className="locate-me flex size-11 items-center justify-center rounded-full bg-[#1d1028] text-amber-200 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-orange-400/40"
            aria-label={mapTheme === "dark" ? "מפה בהירה" : "מפה כהה"}
            title={mapTheme === "dark" ? "מפה בהירה" : "מפה כהה"}
            onClick={toggleMapTheme}
          >
            {mapTheme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          {!pickMode && onLocate ? (
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
          {!pickMode ? <MapLegend /> : null}
        </div>
    </div>
  );
}
