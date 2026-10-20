"use client";

import { useAppNow } from "@/hooks/use-app-clock";
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
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
import { MapGemAnchorLayer, type GemMapAnchorVisual } from "@/components/map-gem-anchor-layer";
import {
  MapGemAnchorEditLayer,
  type GemAnchorEditState,
} from "@/components/map-gem-anchor-edit-layer";
import { MapAddHouseFab } from "@/components/map-add-house-fab";
import { MapLegend } from "@/components/map-legend";
import "leaflet/dist/leaflet.css";
import { config, inNeighborhood } from "@/lib/config";
import { useMapTiles } from "@/hooks/use-map-tiles";
import { postMapTileCacheConfig } from "@/lib/map-tile-cache";
import type { MapTilesConfig } from "@/lib/map-tiles-types";
import type { UserLocation } from "@/hooks/use-user-location";
import type { PublicHouse } from "@/lib/types";
import {
  shouldShowRouteApproach,
  stripApproachFromRouteLine,
  type LatLng,
} from "@/lib/route";
import {
  clusterRouteStopBadgeProgress,
  pinTourRingDecor,
  type ClusterRouteStopBadgeProgress,
} from "@/lib/map-cluster-tour-fill";
import {
  ROUTE_ORIGIN_PURPLE,
  ROUTE_ORIGIN_PURPLE_SHADOW,
  type TourLegTone,
} from "@/lib/route-session-progress";
import { candyPinDot, effectiveVisit, isDecorated, isOwnerFrozen } from "@/lib/house-state";
import { useCatalog } from "@/hooks/use-catalog";
import {
  isClosingSoon,
  isHouseClosedBeforeOpening,
  isHoursNightOver,
  isOnBreak,
  isOpeningSoon,
} from "@/lib/hours";
import type { AddressRevealSchedule } from "@/lib/types";
import { pinScareSrc } from "@/lib/pin-faces";
import { effectiveHouseKind } from "@/lib/house-kind";
import { pinBackgroundFill } from "@/lib/pin-colors";
import { clusterBadgeHouses, clusterHousesByAddress, type HouseCluster } from "@/lib/house-clusters";
import {
  buildingClusterIconKind,
  buildingClusterPinClass,
  pinBuildingClusterIconHtml,
} from "@/lib/map-pin-building-icon";
import { pinSchoolClusterIconHtml } from "@/lib/map-pin-school-icon";
import {
  clusterIsSchoolCampus,
  clusterPinAriaLabel,
  mapCoordsForHouse,
  usesSchoolCampusClusterChrome,
} from "@/lib/school-campus";
import { cn } from "@/lib/utils";
import {
  gemMapHouseIdSet,
  clusterGemRingCacheKey,
  mapPinRingDecorForCluster,
  mapPinRingDecorForHouse,
  type MapGemPinRingContext,
} from "@/lib/map-gem-pin-ring";
import { mapPinIconCacheGemRingEpoch } from "@/lib/map-pin-icon-cache";
function useMinuteTick() {
  const now = useAppNow();
  return Math.floor(now.getTime() / 15_000);
}

/** CARTO Voyager only — one tile set per view (no dark/light double fetch). */
function mapTileUrl(tiles: MapTilesConfig): string {
  if (tiles.invert) return tiles.url;
  return (
    tiles.lightUrl ??
    tiles.url.replace("/dark_all/", "/rastertiles/voyager/")
  );
}

type RouteStopBadgeProgress = ClusterRouteStopBadgeProgress;

function routeBadgeHtml(order: number, progress: RouteStopBadgeProgress = "open") {
  const progressClass =
    progress === "visited"
      ? " is-visited"
      : progress === "skipped"
        ? " is-skipped"
        : progress === "mixed"
          ? " is-mixed-done"
          : "";
  return `<span class="route-stop-pin${progressClass}" aria-label="עצירה ${order}"><b class="route-stop-num">${order}</b></span>`;
}

function routeBadgeProgressForCluster(
  houses: PublicHouse[],
  visitedIds: readonly string[],
  skippedIds?: ReadonlySet<string>,
): RouteStopBadgeProgress {
  return clusterRouteStopBadgeProgress(
    houses,
    visitedIds,
    skippedIds ? [...skippedIds] : [],
  );
}

function wrapRoutePin(
  html: string,
  routeOrder?: number,
  shellClass = "",
  badgeProgress: RouteStopBadgeProgress = "open",
) {
  const badge = routeOrder ? routeBadgeHtml(routeOrder, badgeProgress) : "";
  return {
    extraH: 0,
    html: `<div class="house-pin-route${shellClass}">${html}${badge}</div>`,
  };
}

const PIN_BOX = 62;
const SCHOOL_CAMPUS_PIN_BOX = 88;
/** Matches `.house-pin` width/height in CSS. */
const PIN_DISC = 56;
/** `.house-pin.is-cluster-ellipse` disc size in CSS. */
const CLUSTER_DISC = 66;
const APT_DOTS_BELOW = 20;
/** Route number badge overlap above the disc. */
const ROUTE_BADGE_ABOVE = 12;

function leafletPinLayout(options: {
  pinBox?: number;
  routeOrder?: number;
  aptDots?: boolean;
  schoolCampus?: boolean;
  clusterEllipse?: boolean;
}): { iconSize: [number, number]; iconAnchor: [number, number] } {
  const pinBox = options.pinBox ?? PIN_BOX;
  /** Fixed slot so route mode toggle does not shift geographic anchor. */
  const badgePad = ROUTE_BADGE_ABOVE;
  if (options.schoolCampus) {
    const h = badgePad + pinBox + 22 + (options.aptDots ? APT_DOTS_BELOW : 0);
    return {
      iconSize: [pinBox, h],
      iconAnchor: [pinBox / 2, badgePad + pinBox / 2],
    };
  }
  const discH = options.clusterEllipse ? CLUSTER_DISC : PIN_DISC;
  const bottomPad = options.aptDots ? APT_DOTS_BELOW : 4;
  const h = badgePad + discH + bottomPad;
  const anchorY = badgePad + discH / 2;
  return {
    iconSize: [pinBox, h],
    iconAnchor: [pinBox / 2, anchorY],
  };
}

function attr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function pinVisitKind(
  house: PublicHouse,
  now: Date,
  addressReveal?: AddressRevealSchedule,
): "closed" | "break" | null {
  if (effectiveVisit(house) === "closed") return "closed";
  if (isHoursNightOver(house, now)) return "closed";
  if (isHouseClosedBeforeOpening(house, now, addressReveal)) return "closed";
  if (isOwnerFrozen(house, now.getTime()) || isOnBreak(house, now)) return "break";
  return null;
}

function pinFaceKind(house: PublicHouse): "bare" | "scare" {
  return isDecorated(house) ? "scare" : "bare";
}

function pinStatusMark(
  house: PublicHouse,
  now: Date,
  addressReveal: AddressRevealSchedule | undefined,
  skipped = false,
) {
  if (skipped) return "";
  const visit = pinVisitKind(house, now, addressReveal);
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

function pinFaceHtml(house: PublicHouse) {
  const level = pinFaceKind(house) === "scare" ? (house.scareLevel ?? "mild") : "mild";
  const src = pinScareSrc(house, level);
  return `<img class="pin-scare" src="${attr(src)}" alt="" />`;
}

function pinClusterIconHtml(houses: PublicHouse[]) {
  return pinBuildingClusterIconHtml(houses);
}

function clusterAptDotsHtml(
  houses: PublicHouse[],
  now: Date,
  addressReveal: AddressRevealSchedule | undefined,
  matchedIds?: ReadonlySet<string>,
  skippedIds?: ReadonlySet<string>,
  /** School campus shows candy/skip even for a single booth. */
  showWhenSingle = false,
) {
  if (houses.length <= 1 && !showWhenSingle) return "";
  const dots = clusterBadgeHouses(houses)
    .map((house) => {
      const filteredClass =
        matchedIds && !matchedIds.has(house.id) ? " is-filtered-out" : "";
      if (skippedIds?.has(house.id)) {
        return `<i class="pin-apt-dot is-skipped${filteredClass}"></i>`;
      }
      const visit = pinVisitKind(house, now, addressReveal);
      if (visit === "closed") return `<i class="pin-apt-dot is-closed${filteredClass}"></i>`;
      if (visit === "break") return `<i class="pin-apt-dot is-break${filteredClass}"></i>`;
      const dot = candyPinDot(house) ?? "out";
      return `<i class="pin-apt-dot is-${dot}${filteredClass}"></i>`;
    })
    .join("");
  return `<span class="pin-apt-dots" aria-hidden="true">${dots}</span>`;
}

function housePinHtml(
  house: PublicHouse,
  now: Date,
  gemCtx: MapGemPinRingContext,
  extras?: {
    selected?: boolean;
    houseId?: string;
    extraClass?: string;
    extraStyle?: string;
    filteredOut?: boolean;
    visitedIds?: readonly string[];
    skippedIds?: readonly string[];
    routeModeActive?: boolean;
  },
) {
  const selectedClass = extras?.selected ? " is-selected" : "";
  const filteredClass = extras?.filteredOut ? " is-filtered-out" : "";
  const { hoursSoonClass: hoursClass, ringHtml } = mapPinRingDecorForHouse(house, now, gemCtx);
  const face = pinFaceKind(house);
  const visit = pinVisitKind(house, now, gemCtx.addressReveal);
  const bareClass = face === "bare" ? " is-undecorated" : "";
  const extraClass = extras?.extraClass ? ` ${extras.extraClass}` : "";
  const idAttr = extras?.houseId ? ` data-house-id="${attr(extras.houseId)}"` : "";
  const fill = pinBackgroundFill(house, face !== "bare");
  const tourRing = pinTourRingDecor(
    [house],
    extras?.visitedIds ?? [],
    extras?.skippedIds ? [...extras.skippedIds] : [],
    extras?.routeModeActive ?? false,
  );
  const tourRingActive = tourRing.classSuffix.includes("pin-tour-ring");
  const houseSkipped = Boolean(extras?.skippedIds?.includes(house.id));
  const houseVisited = Boolean(extras?.visitedIds?.includes(house.id));
  const progressClass =
    tourRingActive ? "" : houseSkipped ? " is-skipped" : houseVisited ? " is-visited" : "";
  const ringStyle = tourRing.styleAttr.match(/style="([^"]*)"/)?.[1] ?? "";
  const styleAttr = ` style="background:${fill}${extras?.extraStyle ? `;${extras.extraStyle}` : ""}${ringStyle ? `;${ringStyle}` : ""}"`;
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
  const poiClass = effectiveHouseKind(house) === "poi" ? " is-poi" : "";
  return `<div class="house-pin${poiClass}${selectedClass}${filteredClass}${hoursClass}${bareClass}${progressClass}${tourRing.classSuffix}${extraClass}"${styleAttr} ${label}${idAttr}>${ringHtml}${pinStatusMark(house, now, gemCtx.addressReveal, houseSkipped)}${pinFaceHtml(house)}</div>`;
}

const DIV_ICON_CACHE = new Map<string, L.DivIcon>();

function cachedDivIcon(key: string, build: () => L.DivIcon) {
  const scopedKey = `${mapPinIconCacheGemRingEpoch()}|${key}`;
  const hit = DIV_ICON_CACHE.get(scopedKey);
  if (hit) return hit;
  const icon = build();
  DIV_ICON_CACHE.set(scopedKey, icon);
  return icon;
}

function clusterIcon(
  cluster: HouseCluster,
  selectedId: string | null | undefined,
  now: Date,
  gemCtx: MapGemPinRingContext,
  routeOrder?: number,
  visitedIds: string[] = [],
  filteredOut = false,
  matchedIds?: ReadonlySet<string>,
  skippedIds?: ReadonlySet<string>,
  routeModeActive = false,
  routeHouseId?: string,
) {
  const houses = cluster.houses;
  const onTourRoute = routeOrder != null;
  const decorRouteMode = routeModeActive && onTourRoute;
  const badgeProgress = routeBadgeProgressForCluster(houses, visitedIds, skippedIds);
  const only = houses[0];
  const selectedHere = Boolean(selectedId && houses.some((house) => house.id === selectedId));
  const selectedClass = selectedHere ? " is-selected" : "";
  const filterClass = filteredOut ? " is-filtered-out" : "";
  if (!only) {
    const wrapped = wrapRoutePin("", routeOrder, "", badgeProgress);
    const layout = leafletPinLayout({ routeOrder });
    return L.divIcon({
      className: `pumpkin-pin-icon${selectedClass}${filterClass}`,
      html: wrapped.html,
      iconSize: layout.iconSize,
      iconAnchor: layout.iconAnchor,
    });
  }

  const schoolCampus = clusterIsSchoolCampus(houses);
  if (houses.length <= 1 && !schoolCampus) {
    const { hoursSoonClass: hoursClass } = mapPinRingDecorForHouse(only, now, gemCtx);
    const wrapped = wrapRoutePin(
      housePinHtml(only, now, gemCtx, {
        selected: selectedHere,
        filteredOut: matchedIds ? !matchedIds.has(only.id) : false,
        visitedIds,
        skippedIds: skippedIds ? [...skippedIds] : [],
        routeModeActive: decorRouteMode,
      }),
      routeOrder,
      "",
      routeBadgeProgressForCluster([only], visitedIds, skippedIds),
    );
    const layout = leafletPinLayout({ routeOrder, aptDots: false });
    return L.divIcon({
      className: `pumpkin-pin-icon${selectedClass}${filterClass}${hoursClass}`,
      html: wrapped.html,
      iconSize: layout.iconSize,
      iconAnchor: layout.iconAnchor,
    });
  }

  const clusterKind = schoolCampus ? null : buildingClusterIconKind(houses);
  const clusterIconHtml = schoolCampus ? pinSchoolClusterIconHtml() : pinClusterIconHtml(houses);
  const campusClass = schoolCampus ? " is-school-campus" : "";
  const clusterKindClass = clusterKind ? ` ${buildingClusterPinClass(clusterKind)}` : "";
  const clusterLabel = attr(clusterPinAriaLabel(houses));
  const pinFill = "#6d28d9";
  const clusterRing = mapPinRingDecorForCluster(houses, now, gemCtx);
  const tourRing = pinTourRingDecor(
    houses,
    visitedIds,
    skippedIds ? [...skippedIds] : [],
    decorRouteMode,
  );
  const ringStyle = tourRing.styleAttr.match(/style="([^"]*)"/)?.[1] ?? "";
  const pinStyleAttr = schoolCampus
    ? ` style="background:${pinFill}${ringStyle ? `;${ringStyle}` : ""}"`
    : ringStyle
      ? ` style="${ringStyle}"`
      : "";
  const clusterShell = schoolCampus ? "" : " is-cluster-shell";
  const wrapped = wrapRoutePin(
    `<div class="house-pin is-building${clusterKindClass}${campusClass}${tourRing.classSuffix}${clusterRing.hoursSoonClass}"${pinStyleAttr} role="img" aria-label="${clusterLabel}">${clusterRing.ringHtml}${clusterIconHtml}${clusterAptDotsHtml(houses, now, gemCtx.addressReveal, matchedIds, skippedIds, schoolCampus)}</div>`,
    routeOrder,
    clusterShell,
    badgeProgress,
  );
  const pinBox = schoolCampus ? SCHOOL_CAMPUS_PIN_BOX : PIN_BOX;
  const aptDots = schoolCampus || houses.length > 1;
  const layout = leafletPinLayout({
    pinBox,
    routeOrder,
    aptDots,
    schoolCampus,
    clusterEllipse: !schoolCampus && houses.length > 1,
  });
  return L.divIcon({
    className: `pumpkin-pin-icon pumpkin-pin-building${schoolCampus ? " pumpkin-pin-school" : ""}${selectedClass}${filterClass}${clusterRing.hoursSoonClass}`,
    html: wrapped.html,
    iconSize: layout.iconSize,
    iconAnchor: layout.iconAnchor,
  });
}

const pickIcon = L.divIcon({
  className: "pumpkin-pin-icon",
  html: `<div class="house-pin is-pick" style="background:#6d28d9"><span>📍</span></div>`,
  iconSize: [PIN_BOX, PIN_DISC],
  iconAnchor: [PIN_BOX / 2, PIN_DISC / 2],
});

const originLayout = leafletPinLayout({ aptDots: false });
const originIcon = L.divIcon({
  className: "pumpkin-pin-icon is-origin-pin",
  html: `<div class="house-pin-route"><div class="house-pin is-origin" aria-label="נקודת התחלה"><span>📍</span></div></div>`,
  iconSize: originLayout.iconSize,
  iconAnchor: originLayout.iconAnchor,
});

const youAreHereIcon = L.divIcon({
  className: "you-are-here-wrap",
  html: `<div class="you-are-here" role="img" aria-label="אתם כאן"><span class="you-are-here-pulse" aria-hidden="true"></span><span class="you-are-here-dot" aria-hidden="true"></span></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

/** Imperative Leaflet layers — react-leaflet Marker often misses Android GPS updates. */
function MapUserLocationOverlay({ location }: { location: UserLocation }) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    const marker = L.marker([location.lat, location.lng], {
      icon: youAreHereIcon,
      zIndexOffset: 800,
    });
    marker.addTo(map);
    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
      circleRef.current?.remove();
      circleRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const { lat, lng, accuracy } = location;
    markerRef.current?.setLatLng([lat, lng]);
    const showRing = accuracy > 8 && accuracy < 120;
    if (showRing) {
      if (!circleRef.current) {
        circleRef.current = L.circle([lat, lng], {
          radius: accuracy,
          color: "#7dd3fc",
          fillColor: "#38bdf8",
          fillOpacity: 0.18,
          weight: 1,
          interactive: false,
        }).addTo(map);
      } else {
        circleRef.current.setLatLng([lat, lng]);
        circleRef.current.setRadius(accuracy);
      }
    } else {
      circleRef.current?.remove();
      circleRef.current = null;
    }
  }, [location, map]);

  return null;
}

/** Keep Leaflet sized to the visible viewport — never pans/zooms the map. */
function SizeSync() {
  const map = useMap();
  useEffect(() => {
    let lastW = 0;
    let lastH = 0;
    let raf = 0;
    const sync = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const size = map.getSize();
        if (size.x === lastW && size.y === lastH) return;
        lastW = size.x;
        lastH = size.y;
        map.invalidateSize({ animate: false });
      });
    };
    const id = window.setTimeout(sync, 40);
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    const container = map.getContainer();
    ro?.observe(container);
    const wrap = container.parentElement;
    if (wrap) ro?.observe(wrap);
    return () => {
      window.clearTimeout(id);
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      ro?.disconnect();
    };
  }, [map]);
  return null;
}

/**
 * After a pin tap, pan so the house stays in the map above the detail sheet
 * and below the top status chip. Closing the sheet leaves the map where it is.
 */
function KeepSelectedVisible({
  lat,
  lng,
  offsetX = 0,
  offsetY = 0,
  enabled,
}: {
  lat: number;
  lng: number;
  offsetX?: number;
  offsetY?: number;
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;

    const adjustForSheet = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--map-sheet-h");
      const sheetH = Number.parseFloat(raw);
      const size = map.getSize();
      if (size.x < 40 || size.y < 40) return;
      const topChrome = 72;
      const point = map.latLngToContainerPoint(L.latLng(lat, lng));
      point.x += offsetX;
      point.y += offsetY;

      if (!Number.isFinite(sheetH) || sheetH < 80) {
        const dx = point.x - size.x / 2;
        const dy = point.y - size.y * 0.42;
        if (Math.abs(dx) >= 8 || Math.abs(dy) >= 8) {
          map.panBy([dx, dy], { animate: true, duration: 0.28 });
        }
        return;
      }

      const visibleBottom = size.y - sheetH;
      const usable = visibleBottom - topChrome;
      if (usable < 40) return;
      const visibleMidY = topChrome + usable * 0.62;
      const dx = point.x - size.x / 2;
      const dy = point.y - visibleMidY;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      map.panBy([dx, dy], { animate: true, duration: 0.28 });
    };

    const ensureOnMap = () => {
      map.invalidateSize({ animate: false });
      const size = map.getSize();
      if (size.x < 40 || size.y < 40) return;
      const point = map.latLngToContainerPoint(L.latLng(lat, lng));
      const margin = 56;
      const offScreen =
        point.x < margin ||
        point.x > size.x - margin ||
        point.y < margin ||
        point.y > size.y - margin;
      if (offScreen) {
        map.panTo([lat, lng], { animate: false });
      }
      adjustForSheet();
    };

    const onSheet = () => ensureOnMap();
    const timer = window.setTimeout(ensureOnMap, 70);
    window.addEventListener("hw-map-sheet", onSheet);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hw-map-sheet", onSheet);
    };
  }, [map, lat, lng, offsetX, offsetY, enabled]);
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

/** Embed preview (house link page): center once the map has laid out. */
function CenterOnHouse({
  lat,
  lng,
  zoom,
}: {
  lat: number;
  lng: number;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const go = () => {
      map.invalidateSize({ animate: false });
      map.setView([lat, lng], zoom, { animate: false });
    };
    const timer = window.setTimeout(go, 60);
    return () => window.clearTimeout(timer);
  }, [map, lat, lng, zoom]);
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

const ClusterMarker = memo(function ClusterMarker({
  cluster,
  selectedId,
  clusterOverview,
  onSelect,
  onClose,
  routeOrder,
  routeHouseId,
  visitedIds,
  skippedIds,
  filteredOut,
  matchedIds,
  matchedIdsKey,
  gemPinRingCtx,
  routeModeActive,
}: {
  cluster: HouseCluster;
  selectedId?: string | null;
  clusterOverview?: boolean;
  onSelect?: (house: PublicHouse, opts?: { clusterOverview?: boolean }) => void;
  onClose?: () => void;
  routeOrder?: number;
  routeHouseId?: string;
  visitedIds: string[];
  skippedIds?: ReadonlySet<string>;
  filteredOut?: boolean;
  matchedIds?: ReadonlySet<string>;
  matchedIdsKey?: string;
  gemPinRingCtx: MapGemPinRingContext;
  routeModeActive?: boolean;
}) {
  const tick = useMinuteTick();
  const selectedHere = Boolean(selectedId && cluster.houses.some((h) => h.id === selectedId));
  const now = new Date(tick * 15_000);
  const closingSoon = cluster.houses.some((house) => isClosingSoon(house, now));
  const openingSoon = !closingSoon && cluster.houses.some((house) => isOpeningSoon(house, now));
  const visitedKey = useMemo(
    () => cluster.houses.map((house) => (visitedIds.includes(house.id) ? "1" : "0")).join(""),
    [cluster.houses, visitedIds],
  );
  const skippedKey = useMemo(
    () => cluster.houses.map((house) => (skippedIds?.has(house.id) ? "1" : "0")).join(""),
    [cluster.houses, skippedIds],
  );
  const gemRingKey = useMemo(
    () => clusterGemRingCacheKey(cluster.houses, gemPinRingCtx),
    [cluster.houses, gemPinRingCtx],
  );
  const icon = useMemo(() => {
    const cacheKey = [
      cluster.key,
      selectedId ?? "",
      tick,
      routeOrder ?? "",
      routeHouseId ?? "",
      visitedKey,
      skippedKey,
      routeModeActive ? "1" : "0",
      filteredOut ? "1" : "0",
      matchedIdsKey ?? "",
      gemRingKey,
    ].join("|");
    return cachedDivIcon(cacheKey, () =>
      clusterIcon(
        cluster,
        selectedId,
        now,
        gemPinRingCtx,
        routeOrder,
        visitedIds,
        filteredOut,
        matchedIds,
        skippedIds,
        routeModeActive,
        routeHouseId,
      ),
    );
  }, [
    cluster,
    selectedId,
    tick,
    routeOrder,
    routeHouseId,
    visitedKey,
    skippedKey,
    routeModeActive,
    filteredOut,
    matchedIdsKey,
    matchedIds,
    visitedIds,
    skippedIds,
    now,
    gemPinRingCtx,
    gemRingKey,
  ]);

  const onMarkerClick = useCallback(
    (event: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(event.originalEvent);
      const isMulti = cluster.houses.length > 1;
      const clusterShell = isMulti || usesSchoolCampusClusterChrome(cluster.houses);
      if (clusterShell) {
        if (selectedHere && clusterOverview) {
          onClose?.();
          return;
        }
        if (selectedHere && !clusterOverview) {
          const current = cluster.houses.find((house) => house.id === selectedId) ?? cluster.houses[0]!;
          onSelect?.(current, { clusterOverview: true });
          return;
        }
        onSelect?.(cluster.houses[0]!, { clusterOverview: true });
        return;
      }
      const only = cluster.houses[0]!;
      if (only.id === selectedId) {
        onClose?.();
        return;
      }
      onSelect?.(only);
    },
    [cluster, clusterOverview, onClose, onSelect, selectedHere, selectedId],
  );

  const eventHandlers = useMemo(
    () => ({
      click: onMarkerClick,
    }),
    [onMarkerClick],
  );

  return (
    <Marker
      key={cluster.key}
      position={[cluster.lat, cluster.lng]}
      icon={icon}
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
                  ? 480
                  : 0
      }
      eventHandlers={eventHandlers}
    />
  );
});

type Props = {
  houses?: PublicHouse[];
  selectedId?: string | null;
  clusterOverview?: boolean;
  onSelect?: (house: PublicHouse, opts?: { clusterOverview?: boolean }) => void;
  onClose?: () => void;
  pickMode?: boolean;
  pick?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  /** Add-house: allow drag / map tap to move pin (off for fixed campuses). */
  pickDraggable?: boolean;
  className?: string;
  /** @deprecated Use followSelection — kept so call sites can still pass active. */
  active?: boolean;
  /** When false, skip pan-to-selected while a sheet/dialog covers the map (map stays live). */
  followSelection?: boolean;
  userLocation?: UserLocation | null;
  /** @deprecated No map movement — kept for call-site compatibility. */
  followTick?: number;
  /** @deprecated No map movement — kept for call-site compatibility. */
  fitTick?: number;
  locating?: boolean;
  onLocate?: () => void;
  routeLine?: LatLng[] | null;
  routeLineSegments?: {
    points: [LatLng, LatLng];
    tone?: TourLegTone;
    done: boolean;
    skipped?: boolean;
  }[] | null;
  routeStops?: { id: string; order: number; lat: number; lng: number }[] | null;
  /** Pinned stop numbers for visited/skipped houses still shown on the map in route mode. */
  routeSessionDisplayOrders?: Map<string, number> | null;
  routeStart?: LatLng | null;
  routeStartedFrom?: "gps" | "neighborhood" | "custom" | null;
  visitedIds?: string[];
  skippedIds?: string[];
  originMarker?: LatLng | null;
  originPickActive?: boolean;
  originPick?: LatLng | null;
  onOriginPick?: (lat: number, lng: number) => void;
  panTo?: LatLng | null;
  panTick?: number;
  statsFab?: ReactNode;
  /** House ids that pass the current filter — others render faded on the map. */
  matchedIds?: ReadonlySet<string>;
  /** Stable serialization of matched ids for pin icon memoization. */
  matchedIdsKey?: string;
  filterDimActive?: boolean;
  /** Compact embed on house link pages — center on the house, theme toggle only. */
  embed?: boolean;
  /** Show «המיקום שלי» on embed maps (admin gem manager). */
  showLocateButton?: boolean;
  /** When embed + selectedId, pan/zoom to house (off for admin gem map). */
  embedCenterOnSelect?: boolean;
  /** Tap gem anchor marker (admin QA posters). */
  onGemAnchorSelect?: (house: PublicHouse) => void;
  /** @deprecated Separate gem markers — use {@link showGemPinRings} on house pins. */
  showGemAnchors?: boolean;
  /** When false, gem anchor markers stay bright even if house filters hide other pins. */
  gemAnchorRespectFilters?: boolean;
  /** Map legend «יהלומים» section — when gem hunt UI is on (independent of anchor toggle). */
  showGemLegend?: boolean;
  gemAnchorHouses?: PublicHouse[];
  /** Houses that get yellow gem pin rings — defaults to {@link gemAnchorHouses} when omitted. */
  gemPinRingHouses?: PublicHouse[];
  gemAnchorVisual?: GemMapAnchorVisual;
  isGemCollected?: (houseId: string) => boolean;
  /** Yellow/diamond rings on pins when toolbar gem map toggle is on. */
  showGemPinRings?: boolean;
  /** Hunt-range gems — sparkle ring on pins even when {@link showGemPinRings} is off. */
  gemNearHouseIds?: ReadonlySet<string>;
  /** Owner/admin gem placement — draggable demon around the selected house. */
  gemAnchorEdit?: GemAnchorEditState | null;
  /** Tour mode — cluster ring uses orange for open slices instead of white. */
  routeModeActive?: boolean;
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
  pickDraggable = true,
  className,
  active = true,
  followSelection = active,
  userLocation = null,
  locating = false,
  onLocate,
  routeLine = null,
  routeLineSegments = null,
  routeStops = null,
  routeSessionDisplayOrders = null,
  routeStart = null,
  routeStartedFrom = null,
  visitedIds = [],
  skippedIds = [],
  originMarker = null,
  originPickActive = false,
  originPick = null,
  onOriginPick,
  panTo = null,
  panTick = 0,
  statsFab = null,
  matchedIds,
  matchedIdsKey = "",
  filterDimActive = false,
  embed = false,
  showLocateButton = false,
  embedCenterOnSelect = true,
  onGemAnchorSelect,
  showGemAnchors = false,
  gemAnchorRespectFilters = true,
  showGemLegend = false,
  gemAnchorHouses = [],
  gemPinRingHouses,
  gemAnchorVisual = "admin",
  isGemCollected,
  showGemPinRings = false,
  gemNearHouseIds,
  gemAnchorEdit = null,
  routeModeActive = false,
}: Props) {
  const { catalog } = useCatalog();
  const addressRevealSchedule = catalog?.eventSettings?.addressReveal;
  const pinRingHouses = gemPinRingHouses ?? gemAnchorHouses;
  const gemHouseIds = useMemo(() => gemMapHouseIdSet(pinRingHouses), [pinRingHouses]);
  const gemPinRingCtx = useMemo(
    (): MapGemPinRingContext => ({
      showGemRings: showGemPinRings,
      nearGemHouseIds: gemNearHouseIds,
      gemHouseIds,
      isCollected: isGemCollected ?? (() => true),
      addressReveal: addressRevealSchedule,
    }),
    [showGemPinRings, gemNearHouseIds, gemHouseIds, isGemCollected, addressRevealSchedule],
  );
  const clusters = useMemo(
    () => (pickMode ? [] : clusterHousesByAddress(houses)),
    [houses, pickMode],
  );
  const dimActive = filterDimActive && Boolean(matchedIds);
  const routeOrderById = useMemo(() => {
    const map = new Map<string, number>();
    if (routeSessionDisplayOrders) {
      for (const [id, order] of routeSessionDisplayOrders) map.set(id, order);
    }
    for (const stop of routeStops ?? []) {
      if (!map.has(stop.id)) map.set(stop.id, stop.order);
    }
    return map;
  }, [routeStops, routeSessionDisplayOrders]);
  const skippedIdSet = useMemo(() => new Set(skippedIds), [skippedIds]);
  const lineRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
  const focus = useMemo(() => {
    if (pickMode || !selectedId) return null;
    const cluster = clusters.find((item) => item.houses.some((house) => house.id === selectedId));
    if (!cluster) {
      const house = houses.find((item) => item.id === selectedId);
      if (!house) return null;
      const coords = mapCoordsForHouse(house);
      return { lat: coords.lat, lng: coords.lng, offsetX: 0, offsetY: 0 };
    }
    return { lat: cluster.lat, lng: cluster.lng, offsetX: 0, offsetY: 0 };
  }, [clusters, houses, pickMode, selectedId]);
  const normalizeRouteLine = useCallback(
    (line: LatLng[] | null | undefined) => {
      if (!line || line.length < 2) return null;
      const first = routeStops?.[0];
      const start = routeStart ?? userLocation;
      if (!first || !start) return line;
      if (!shouldShowRouteApproach(start, first, routeStartedFrom)) return line;
      return stripApproachFromRouteLine(line, first, start);
    },
    [routeStops, routeStart, userLocation, routeStartedFrom],
  );
  const displayRouteLine = useMemo(
    () => normalizeRouteLine(routeLine),
    [normalizeRouteLine, routeLine],
  );
  const routePositions = useMemo(
    () =>
      displayRouteLine && displayRouteLine.length >= 2
        ? displayRouteLine.map((point) => [point.lat, point.lng] as [number, number])
        : null,
    [displayRouteLine],
  );
  const routeSegmentLines = useMemo(
    () =>
      routeLineSegments?.map((segment) => ({
        tone: segment.tone ?? (segment.skipped ? "skipped" : segment.done ? "visited" : "open-route"),
        positions: segment.points.map(
          (point) => [point.lat, point.lng] as [number, number],
        ),
      })) ?? [],
    [routeLineSegments],
  );
  const useSegmentRoute = routeSegmentLines.length > 0;
  const { tiles, ready: tilesReady } = useMapTiles();
  useEffect(() => {
    postMapTileCacheConfig();
  }, []);
  const tileUrl = mapTileUrl(tiles);

  return (
    <div
      role="region"
      aria-label="מפת השכונה"
      className={cn(
        "relative z-0 isolate overflow-hidden",
        originPickActive && "is-origin-pick",
        dimActive && "is-filter-dim",
        embed ? "bg-[#14091c]" : "bg-[#d6d3d1]",
        className ?? "h-full min-h-[280px] w-full",
      )}
      dir="ltr"
    >
      <MapContainer
        key={pickMode ? "pick" : embed ? "embed" : "view"}
        center={
          embed && gemAnchorEdit
            ? [gemAnchorEdit.point.lat, gemAnchorEdit.point.lng]
            : embed && focus
              ? [focus.lat, focus.lng]
              : [config.map.center.lat, config.map.center.lng]
        }
        zoom={
          embed && focus
            ? gemAnchorEdit
              ? config.map.zoom
              : config.map.maxZoom - 1
            : config.map.zoom
        }
        minZoom={config.map.minZoom}
        maxZoom={config.map.maxZoom}
        scrollWheelZoom
        renderer={lineRenderer}
        className="h-full w-full rounded-none"
        style={{ height: "100%", width: "100%" }}
      >
        {tilesReady ? (
          <TileLayer
            attribution={tiles.attribution}
            url={tileUrl}
            subdomains={
              "subdomains" in tiles && tiles.subdomains ? tiles.subdomains : "abcd"
            }
            maxZoom={config.map.maxZoom}
            maxNativeZoom={tiles.maxNativeZoom}
            className="hw-basemap"
          />
        ) : null}
        <SizeSync />
        {panTick > 0 && panTo ? <PanTo lat={panTo.lat} lng={panTo.lng} tick={panTick} /> : null}
        {embed && embedCenterOnSelect && focus && !gemAnchorEdit ? (
          <CenterOnHouse lat={focus.lat} lng={focus.lng} zoom={config.map.maxZoom - 1} />
        ) : null}
        {focus && !originPickActive && !embed ? (
          <KeepSelectedVisible
            lat={focus.lat}
            lng={focus.lng}
            offsetX={focus.offsetX}
            offsetY={focus.offsetY}
            enabled={followSelection}
          />
        ) : null}
        {!pickMode && !originPickActive ? (
          <MapDismiss enabled={Boolean(selectedId)} onDismiss={onClose} />
        ) : null}
        {pickMode && pick ? <FollowPick lat={pick.lat} lng={pick.lng} /> : null}
        {pickMode && onPick && pickDraggable ? <ClickCatcher onPick={onPick} /> : null}
        {pickMode && pick ? (
          <Marker
            position={[pick.lat, pick.lng]}
            icon={pickIcon}
            draggable={Boolean(onPick && pickDraggable)}
            eventHandlers={{
              dragend: (event) => {
                if (!pickDraggable) return;
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
        {!pickMode && useSegmentRoute
          ? routeSegmentLines.map((segment, index) => (
              <Fragment key={`route-seg-${index}`}>
                <Polyline
                  positions={segment.positions}
                  pathOptions={{
                    color: ROUTE_ORIGIN_PURPLE_SHADOW,
                    weight: 8,
                    opacity: 0.4,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  smoothFactor={0}
                  interactive={false}
                />
                <Polyline
                  positions={segment.positions}
                  pathOptions={{
                    color: ROUTE_ORIGIN_PURPLE,
                    weight: 5,
                    opacity: 1,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  smoothFactor={0}
                  interactive={false}
                />
              </Fragment>
            ))
          : null}
        {!pickMode && !useSegmentRoute && routePositions ? (
          <>
            <Polyline
              key={`route-shadow-${routePositions.length}-${routePositions[0]?.join(",")}`}
              positions={routePositions}
              pathOptions={{
                color: ROUTE_ORIGIN_PURPLE_SHADOW,
                weight: 8,
                opacity: 0.4,
                lineCap: "round",
                lineJoin: "round",
              }}
              smoothFactor={0}
              interactive={false}
            />
            <Polyline
              key={`route-line-${routePositions.length}-${routePositions[0]?.join(",")}`}
              positions={routePositions}
              pathOptions={{
                color: ROUTE_ORIGIN_PURPLE,
                weight: 5,
                opacity: 1,
                lineCap: "round",
                lineJoin: "round",
              }}
              smoothFactor={0}
              interactive={false}
            />
          </>
        ) : null}
        {!pickMode && gemAnchorEdit ? <MapGemAnchorEditLayer {...gemAnchorEdit} /> : null}
        {!pickMode && !gemAnchorEdit && showGemAnchors && gemAnchorHouses.length > 0 ? (
          <MapGemAnchorLayer
            houses={gemAnchorHouses}
            isCollected={isGemCollected ?? (() => false)}
            matchedIds={matchedIds}
            filterDimActive={gemAnchorRespectFilters ? dimActive : false}
            visual={gemAnchorVisual}
            userLocation={userLocation}
            onSelectHouse={onGemAnchorSelect}
          />
        ) : null}
        {!pickMode &&
          !gemAnchorEdit &&
          clusters.map((cluster) => {
            const clusterFilteredOut =
              dimActive &&
              (cluster.houses.length > 1
                ? cluster.houses.every((house) => !matchedIds?.has(house.id))
                : !matchedIds?.has(cluster.houses[0]!.id));
            return (
              <ClusterMarker
                key={`${cluster.key}|gem-rings:${showGemPinRings ? 1 : 0}|near:${gemNearHouseIds?.size ?? 0}`}
                cluster={cluster}
                selectedId={selectedId}
                clusterOverview={clusterOverview}
                onSelect={onSelect}
                onClose={onClose}
                visitedIds={visitedIds}
                skippedIds={skippedIdSet}
                filteredOut={clusterFilteredOut}
                matchedIds={matchedIds}
                matchedIdsKey={matchedIdsKey}
                gemPinRingCtx={gemPinRingCtx}
                routeOrder={cluster.houses.reduce<number | undefined>(
                  (found, house) => found ?? routeOrderById.get(house.id),
                  undefined,
                )}
                routeHouseId={cluster.houses.find((house) => routeOrderById.has(house.id))?.id}
                routeModeActive={
                  routeModeActive &&
                  cluster.houses.some((house) => routeOrderById.has(house.id))
                }
              />
            );
          })}
        {!pickMode && userLocation ? <MapUserLocationOverlay location={userLocation} /> : null}
      </MapContainer>
      {!pickMode && !originPickActive && !embed ? <MapAddHouseFab /> : null}
      <div className="map-fab-stack">
          {!pickMode && onLocate && (!embed || showLocateButton) ? (
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
          {!pickMode && !embed ? (
            <MapLegend key={showGemLegend ? "with-gems" : "base"} showGemLegend={showGemLegend} />
          ) : null}
          {!pickMode && !embed ? statsFab : null}
        </div>
    </div>
  );
}
