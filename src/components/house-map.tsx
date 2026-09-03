"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
import { config, formatDisplayAddress, inNeighborhood } from "@/lib/config";
import type { UserLocation } from "@/hooks/use-user-location";
import type { PublicHouse } from "@/lib/types";
import { ROUTE_INCLUDE_ORIGIN_METERS, type LatLng } from "@/lib/route";
import { distanceMeters } from "@/lib/geo";
import { houseHeadline, themeEmoji } from "@/lib/labels";
import { effectiveVisit } from "@/lib/house-state";
import { clusterHousesByAddress, type HouseCluster } from "@/lib/house-clusters";
import { HouseTags } from "@/components/house-tags";
import { cn } from "@/lib/utils";

function routeOrderIcon(order: number) {
  return L.divIcon({
    className: "route-stop-icon",
    html: `<div class="route-stop-pin" aria-label="עצירה ${order}">${order}</div>`,
    iconSize: [28, 34],
    iconAnchor: [14, 56],
  });
}

function houseWalkLinks(house: PublicHouse) {
  const displayAddress = formatDisplayAddress(house);
  const mapsQuery = /רמת\s*גן/u.test(displayAddress)
    ? displayAddress
    : `${displayAddress}, רמת גן`;
  return {
    maps: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery)}&travelmode=walking`,
    waze: `https://waze.com/ul?q=${encodeURIComponent(mapsQuery)}&navigate=yes`,
  };
}

function pinIcon(house: PublicHouse, count = 1) {
  const emoji = themeEmoji[house.theme ?? "pumpkin"];
  const badge =
    count > 1
      ? `<b class="pin-count" aria-label="${count} דירות">×${count}</b>`
      : "";
  return L.divIcon({
    className: "pumpkin-pin-icon",
    html: `<div class="house-pin" style="background:#6d28d9">${badge}<span>${emoji}</span></div>`,
    iconSize: [40, 44],
    iconAnchor: [20, 42],
    popupAnchor: [0, -36],
  });
}

function clusterIcon(cluster: HouseCluster) {
  return pinIcon(cluster.houses[0], cluster.houses.length);
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

function bindPopupRoot(node: HTMLDivElement | null) {
  if (!node) return;
  L.DomEvent.disableClickPropagation(node);
  L.DomEvent.disableScrollPropagation(node);
}

/** Show two apartments; anything after that scrolls inside the popup. */
const POPUP_VISIBLE_APARTMENTS = 2;

function capPopupList(node: HTMLUListElement, rows = POPUP_VISIBLE_APARTMENTS) {
  const items = [...node.children] as HTMLElement[];
  if (items.length <= rows) {
    node.style.maxHeight = "";
    node.classList.remove("is-capped");
    return;
  }
  node.classList.remove("is-capped");
  node.style.maxHeight = "none";
  void node.offsetHeight;
  const styles = getComputedStyle(node);
  const gap = Number.parseFloat(styles.rowGap || styles.gap || "6") || 6;
  const height =
    items.slice(0, rows).reduce((sum, el) => sum + el.offsetHeight, 0) + gap * (rows - 1);
  node.classList.add("is-capped");
  if (height > 0) node.style.maxHeight = `${Math.round(height)}px`;
}

/** Keep apartment-list swipes on the list so the map does not steal them. */
function bindPopupList(node: HTMLUListElement | null) {
  if (!node) return;
  capPopupList(node);
  if (node.dataset.scrollBound === "1") return;
  node.dataset.scrollBound = "1";
  L.DomEvent.disableClickPropagation(node);
  L.DomEvent.disableScrollPropagation(node);
  const stop = (event: Event) => event.stopPropagation();
  node.addEventListener("touchmove", stop, { passive: true });
  node.addEventListener("pointermove", stop, { passive: true });
}

function useMapPopupMaxHeight() {
  const map = useMap();
  const [maxHeight, setMaxHeight] = useState(240);
  useEffect(() => {
    const update = () => {
      setMaxHeight(Math.max(168, map.getSize().y - 72));
    };
    update();
    map.on("resize", update);
    return () => {
      map.off("resize", update);
    };
  }, [map]);
  return maxHeight;
}

function HousePreviewPopup({
  houses,
  onOpenDetails,
  selectedId,
  interactive = true,
}: {
  houses: PublicHouse[];
  onOpenDetails?: (house: PublicHouse) => void;
  selectedId?: string | null;
  /** False for a short moment after open so the same tap cannot hit buttons. */
  interactive?: boolean;
}) {
  const map = useMap();
  const multi = houses.length > 1;
  const address = houses[0] ? formatDisplayAddress(houses[0]) : "";
  const popupMaxHeight = useMapPopupMaxHeight();
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (!multi) return;
    const node = listRef.current;
    if (!node) return;
    const run = () => capPopupList(node);
    run();
    const frame = window.requestAnimationFrame(run);
    const later = window.setTimeout(run, 80);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(later);
    };
  }, [multi, houses, popupMaxHeight]);

  return (
    <Popup
      className="house-map-popup-root"
      maxWidth={multi ? 280 : 260}
      minWidth={multi ? 200 : 176}
      autoPan={false}
      keepInView={false}
      closeButton
    >
      <div
        ref={bindPopupRoot}
        dir="rtl"
        className={cn("house-map-popup", multi && "is-multi")}
        style={{
          ...(interactive ? undefined : { pointerEvents: "none" }),
          ...(multi ? { ["--house-popup-max" as string]: `${popupMaxHeight}px` } : undefined),
        }}
      >
        {multi ? (
          <>
            <div className="house-map-popup-cluster-head">
              <strong>{address}</strong>
              <span className="house-map-popup-badge">{houses.length} בתים</span>
            </div>
            <p className="house-map-popup-meta">בחרו דירה בבניין</p>
            <ul
              ref={(node) => {
                listRef.current = node;
                bindPopupList(node);
              }}
              className={cn("house-map-popup-list", houses.length > 2 && "is-capped")}
            >
              {houses.map((house) => {
                const closed = effectiveVisit(house) === "closed";
                return (
                  <li
                    key={house.id}
                    className={cn(
                      "house-map-popup-item",
                      selectedId === house.id && "is-selected",
                    )}
                  >
                    <button
                      type="button"
                      className="house-map-popup-item-btn"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        map.closePopup();
                        onOpenDetails?.(house);
                      }}
                    >
                      <span className="house-map-popup-item-title">{houseHeadline(house)}</span>
                      {house.arrival ? (
                        <span className="house-map-popup-item-arrival">{house.arrival}</span>
                      ) : null}
                      <div className="house-map-popup-tags">
                        <HouseTags house={house} />
                      </div>
                      {closed ? (
                        <span className="house-map-popup-soldout">נגמר המלאי</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <strong>{houseHeadline(houses[0])}</strong>
            <div className="house-map-popup-meta">{formatDisplayAddress(houses[0])}</div>
            {houses[0].arrival ? (
              <div className="house-map-popup-meta">{houses[0].arrival}</div>
            ) : null}
            <div className="house-map-popup-tags">
              <HouseTags house={houses[0]} />
            </div>
            {effectiveVisit(houses[0]) === "closed" ? (
              <div className="house-map-popup-soldout">נגמר המלאי — אין סיבה לבוא עכשיו</div>
            ) : null}
            <div className="house-map-popup-nav">
              <a
                href={houseWalkLinks(houses[0]).waze}
                target="_blank"
                rel="noreferrer"
                className="house-map-popup-btn"
                onClick={(event) => event.stopPropagation()}
              >
                ניווט ב־Waze
              </a>
              <a
                href={houseWalkLinks(houses[0]).maps}
                target="_blank"
                rel="noreferrer"
                className="house-map-popup-btn is-secondary"
                onClick={(event) => event.stopPropagation()}
              >
                Google Maps
              </a>
            </div>
            {onOpenDetails ? (
              <button
                type="button"
                className="house-map-popup-btn is-ghost"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  map.closePopup();
                  onOpenDetails(houses[0]);
                }}
              >
                לפרטי הבית
              </button>
            ) : null}
          </>
        )}
      </div>
    </Popup>
  );
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
  const markerRef = useRef<L.Marker | null>(null);
  const armTimer = useRef<number>(0);
  const [popupArmed, setPopupArmed] = useState(false);
  const selectedHere = Boolean(selectedId && cluster.houses.some((h) => h.id === selectedId));

  useEffect(() => {
    if (!selectedHere) return;
    markerRef.current?.openPopup();
  }, [selectedHere, selectedId]);

  useEffect(() => () => window.clearTimeout(armTimer.current), []);

  return (
    <Marker
      ref={markerRef}
      position={[cluster.lat, cluster.lng]}
      icon={clusterIcon(cluster)}
      zIndexOffset={selectedHere ? 500 : cluster.houses.length > 1 ? 200 : 0}
      eventHandlers={{
        popupopen: () => {
          setPopupArmed(false);
          window.clearTimeout(armTimer.current);
          armTimer.current = window.setTimeout(() => setPopupArmed(true), 400);
        },
        popupclose: () => {
          window.clearTimeout(armTimer.current);
          setPopupArmed(false);
        },
      }}
    >
      <HousePreviewPopup
        houses={cluster.houses}
        onOpenDetails={onSelect}
        selectedId={selectedId}
        interactive={popupArmed}
      />
    </Marker>
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
          className="locate-me absolute right-3 z-[1100] flex size-11 items-center justify-center rounded-full bg-[#1d1028] text-sky-300 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-sky-400/40 hover:bg-[#2a1638] hover:text-sky-200"
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
