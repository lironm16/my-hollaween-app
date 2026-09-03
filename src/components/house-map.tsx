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
import { LocateFixed, X } from "lucide-react";
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

/** Which pager card is centered — works in RTL where scrollLeft is unreliable. */
function pageFromOverlap(scroller: HTMLElement) {
  const pages = [...scroller.children] as HTMLElement[];
  if (pages.length === 0) return 0;
  const mid = (scroller.getBoundingClientRect().left + scroller.getBoundingClientRect().right) / 2;
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  pages.forEach((page, index) => {
    const box = page.getBoundingClientRect();
    const dist = Math.abs((box.left + box.right) / 2 - mid);
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  });
  return best;
}

function scrollPageIntoView(scroller: HTMLElement, index: number, behavior: ScrollBehavior) {
  const target = scroller.children[index] as HTMLElement | undefined;
  target?.scrollIntoView({ behavior, inline: "start", block: "nearest" });
}

/** Keep pager swipes on the popup so the map does not steal them. */
function bindPopupScroller(node: HTMLDivElement | null) {
  if (!node) return;
  L.DomEvent.disableClickPropagation(node);
  L.DomEvent.disableScrollPropagation(node);
  node.style.touchAction = "pan-x";
}

function PopupCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      className="house-map-popup-close"
      aria-label="סגירה"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <X aria-hidden strokeWidth={2.5} />
    </button>
  );
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
  const startIndex = Math.max(
    0,
    houses.findIndex((house) => house.id === selectedId),
  );
  const [page, setPage] = useState(startIndex);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPage(startIndex);
  }, [startIndex]);

  useEffect(() => {
    if (!multi) return;
    const node = scrollerRef.current;
    if (!node) return;
    bindPopupScroller(node);
    const stop = (event: Event) => event.stopPropagation();
    const sync = () => setPage(pageFromOverlap(node));
    node.addEventListener("touchmove", stop, { passive: true });
    node.addEventListener("pointermove", stop, { passive: true });
    node.addEventListener("scroll", sync, { passive: true });
    const jump = () => scrollPageIntoView(node, startIndex, "instant");
    const frame = window.requestAnimationFrame(jump);
    const later = window.setTimeout(jump, 80);
    return () => {
      node.removeEventListener("touchmove", stop);
      node.removeEventListener("pointermove", stop);
      node.removeEventListener("scroll", sync);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(later);
    };
  }, [multi, houses, startIndex]);

  const closePopup = () => map.closePopup();
  const openHouse = (house: PublicHouse) => {
    closePopup();
    onOpenDetails?.(house);
  };
  const goToPage = (index: number) => {
    const node = scrollerRef.current;
    if (!node) return;
    setPage(index);
    scrollPageIntoView(node, index, "smooth");
  };

  return (
    <Popup
      className="house-map-popup-root"
      maxWidth={multi ? 288 : 260}
      minWidth={multi ? 220 : 176}
      autoPan={false}
      keepInView={false}
      closeButton={false}
    >
      <div
        ref={bindPopupRoot}
        dir="rtl"
        className={cn("house-map-popup", multi && "is-multi")}
        style={interactive ? undefined : { pointerEvents: "none" }}
      >
        {multi ? (
          <>
            <div className="house-map-popup-cluster-head">
              <div className="house-map-popup-cluster-copy">
                <strong>{address}</strong>
                <p className="house-map-popup-meta">{houses.length} דירות בבניין</p>
              </div>
              <PopupCloseButton onClose={closePopup} />
            </div>
            <div className="house-map-popup-pager">
              <div
                ref={scrollerRef}
                className="house-map-popup-scroller"
                role="region"
                aria-roledescription="carousel"
                aria-label="דירות בבניין"
              >
                {houses.map((house, index) => {
                  const closed = effectiveVisit(house) === "closed";
                  return (
                    <div
                      key={house.id}
                      className={cn(
                        "house-map-popup-page",
                        selectedId === house.id && "is-selected",
                      )}
                      aria-hidden={page !== index}
                    >
                      <button
                        type="button"
                        className="house-map-popup-item-btn"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openHouse(house);
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
                    </div>
                  );
                })}
              </div>
              <div className="house-map-popup-dots" role="tablist" aria-label="בחירת דירה">
                {houses.map((house, index) => (
                  <button
                    key={house.id}
                    type="button"
                    role="tab"
                    aria-selected={page === index}
                    aria-label={`${houseHeadline(house)} · ${index + 1} מתוך ${houses.length}`}
                    className={cn("house-map-popup-dot", page === index && "is-active")}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      goToPage(index);
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="house-map-popup-cluster-head">
              <strong>{houseHeadline(houses[0])}</strong>
              <PopupCloseButton onClose={closePopup} />
            </div>
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
                Waze
              </a>
              <a
                href={houseWalkLinks(houses[0]).maps}
                target="_blank"
                rel="noreferrer"
                className="house-map-popup-btn is-secondary"
                onClick={(event) => event.stopPropagation()}
              >
                Maps
              </a>
            </div>
            {onOpenDetails ? (
              <button
                type="button"
                className="house-map-popup-btn is-ghost"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openHouse(houses[0]);
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
