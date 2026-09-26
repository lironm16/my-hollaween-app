"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import { gemAnchorForHouse } from "@/lib/gem-hunt";
import { gemMonsterForHouse, gemMonsterMeta } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

/** admin = offset anchors + spokes (QA). compact = tiny diamonds. characters = admin QA posters. */
export type GemMapAnchorVisual = "admin" | "compact" | "characters";

const GEM_ICON_ADMIN = 30;
const GEM_ICON_COMPACT = 18;
const GEM_ICON_CHARACTER = 36;
const COMPACT_MIN_ZOOM = 15;

const gemDiamondIconCache = new Map<string, L.DivIcon>();
const gemCharacterIconCache = new Map<string, L.DivIcon>();

function gemDiamondIcon(
  collected: boolean,
  dimmed: boolean,
  calibrated: boolean,
  compact: boolean,
) {
  const key = `${compact ? "c" : "a"}-${collected ? "c" : "o"}-${dimmed ? "d" : "a"}-${calibrated ? "cal" : "auto"}`;
  let icon = gemDiamondIconCache.get(key);
  const size = compact ? GEM_ICON_COMPACT : GEM_ICON_ADMIN;
  if (!icon) {
    icon = L.divIcon({
      className: "map-gem-diamond-leaflet-icon",
      html: `<div class="map-gem-diamond-marker${compact ? " map-gem-diamond-marker--compact" : ""}${collected ? " is-collected" : ""}${dimmed ? " is-dimmed" : ""}${calibrated ? " is-calibrated" : ""}" aria-hidden="true">
        <svg class="map-gem-diamond-marker__svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 3h12l4 7-10 13L2 10l4-7z" fill="currentColor"/>
        </svg>
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    gemDiamondIconCache.set(key, icon);
  }
  return icon;
}

function escapeHtmlAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function posterUrl(posterPath: string) {
  if (typeof window === "undefined") return posterPath;
  return new URL(posterPath, window.location.origin).href;
}

function gemCharacterIcon(
  house: PublicHouse,
  collected: boolean,
  dimmed: boolean,
  calibrated: boolean,
) {
  const monsterId = gemMonsterForHouse(house);
  const posterPath = posterUrl(gemMonsterMeta(monsterId).posterPath);
  const key = `${house.id}-${monsterId}-${collected ? "c" : "o"}-${dimmed ? "d" : "a"}-${calibrated ? "cal" : "auto"}`;
  let icon = gemCharacterIconCache.get(key);
  const size = GEM_ICON_CHARACTER;
  if (!icon) {
    const markerClass = cn(
      "map-gem-character-marker",
      collected && "is-collected",
      dimmed && "is-dimmed",
      calibrated && "is-calibrated",
    );
    const html = renderToStaticMarkup(
      <div
        className={markerClass}
        style={{ backgroundImage: `url("${escapeHtmlAttr(posterPath)}")` }}
        aria-hidden
      />,
    );
    icon = L.divIcon({
      className: "map-gem-character-leaflet-icon",
      html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    gemCharacterIconCache.set(key, icon);
  }
  return icon;
}

function GemMapZoomGate({ minZoom, children }: { minZoom: number; children: ReactNode }) {
  const map = useMap();
  const [visible, setVisible] = useState(() => map.getZoom() >= minZoom);
  useMapEvents({
    zoomend: () => setVisible(map.getZoom() >= minZoom),
    moveend: () => setVisible(map.getZoom() >= minZoom),
  });
  if (!visible) return null;
  return children;
}

export function MapGemAnchorLayer({
  houses,
  isCollected,
  matchedIds,
  filterDimActive = false,
  visual = "admin",
}: {
  houses: PublicHouse[];
  isCollected: (houseId: string) => boolean;
  matchedIds?: ReadonlySet<string>;
  filterDimActive?: boolean;
  visual?: GemMapAnchorVisual;
}) {
  const { overrides } = useGemAnchorOverrides();
  const compact = visual === "compact";
  const characters = visual === "characters";

  const markers = useMemo(() => {
    return houses
      .map((house) => {
        const anchor = gemAnchorForHouse(house);
        const collected = isCollected(house.id);
        if (compact && collected) return null;
        const dimmed =
          filterDimActive && matchedIds != null && !matchedIds.has(house.id);
        return {
          house,
          anchor,
          collected,
          dimmed,
          calibrated: anchor.calibrated === true || Boolean(overrides[house.id]),
        };
      })
      .filter(Boolean) as Array<{
      house: PublicHouse;
      anchor: ReturnType<typeof gemAnchorForHouse>;
      collected: boolean;
      dimmed: boolean;
      calibrated: boolean;
    }>;
  }, [houses, isCollected, matchedIds, filterDimActive, overrides, compact]);

  const layer = (
    <>
      {markers.map(({ house, anchor, collected, dimmed, calibrated }) => (
        <Fragment key={`gem-anchor-${house.id}`}>
          {!compact && !collected ? (
            <Polyline
              positions={[
                [house.lat, house.lng],
                [anchor.lat, anchor.lng],
              ]}
              pathOptions={{
                color: calibrated ? "#34d399" : characters ? "#fb923c" : "#fbbf24",
                weight: 2,
                opacity: dimmed ? 0.25 : 0.55,
                dashArray: "4 6",
                lineCap: "round",
              }}
              interactive={false}
            />
          ) : null}
          <Marker
            position={[anchor.lat, anchor.lng]}
            icon={
              characters
                ? gemCharacterIcon(house, collected, dimmed, calibrated)
                : gemDiamondIcon(collected, dimmed, calibrated, compact)
            }
            zIndexOffset={collected ? 420 : compact ? 380 : 520}
            interactive={false}
            bubblingMouseEvents={false}
          />
        </Fragment>
      ))}
    </>
  );

  if (compact) {
    return <GemMapZoomGate minZoom={COMPACT_MIN_ZOOM}>{layer}</GemMapZoomGate>;
  }
  return layer;
}
