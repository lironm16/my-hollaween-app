"use client";

import { Fragment, useMemo } from "react";
import { Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import { gemAnchorForHouse } from "@/lib/gem-hunt";
import { gemLabelHe, gemMonsterForHouse } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";

const GEM_ICON = 30;

const gemDiamondIconCache = new Map<string, L.DivIcon>();

function gemDiamondIcon(collected: boolean, dimmed: boolean, calibrated: boolean) {
  const key = `${collected ? "c" : "o"}-${dimmed ? "d" : "a"}-${calibrated ? "cal" : "auto"}`;
  let icon = gemDiamondIconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: "map-gem-diamond-leaflet-icon",
      html: `<div class="map-gem-diamond-marker${collected ? " is-collected" : ""}${dimmed ? " is-dimmed" : ""}${calibrated ? " is-calibrated" : ""}" aria-hidden="true">
        <svg class="map-gem-diamond-marker__svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 3h12l4 7-10 13L2 10l4-7z" fill="currentColor"/>
        </svg>
      </div>`,
      iconSize: [GEM_ICON, GEM_ICON],
      iconAnchor: [GEM_ICON / 2, GEM_ICON / 2],
    });
    gemDiamondIconCache.set(key, icon);
  }
  return icon;
}

export function MapGemAnchorLayer({
  houses,
  isCollected,
  matchedIds,
  filterDimActive = false,
}: {
  houses: PublicHouse[];
  isCollected: (houseId: string) => boolean;
  matchedIds?: ReadonlySet<string>;
  filterDimActive?: boolean;
}) {
  const { overrides } = useGemAnchorOverrides();

  const markers = useMemo(() => {
    return houses.map((house) => {
      const anchor = gemAnchorForHouse(house);
      const collected = isCollected(house.id);
      const dimmed =
        filterDimActive && matchedIds != null && !matchedIds.has(house.id);
      return {
        house,
        anchor,
        collected,
        dimmed,
        calibrated: anchor.calibrated === true || Boolean(overrides[house.id]),
      };
    });
  }, [houses, isCollected, matchedIds, filterDimActive, overrides]);

  return (
    <>
      {markers.map(({ house, anchor, collected, dimmed, calibrated }) => (
        <Fragment key={`gem-anchor-${house.id}`}>
          {!collected ? (
            <Polyline
              positions={[
                [house.lat, house.lng],
                [anchor.lat, anchor.lng],
              ]}
              pathOptions={{
                color: calibrated ? "#34d399" : "#fbbf24",
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
            icon={gemDiamondIcon(collected, dimmed, calibrated)}
            zIndexOffset={collected ? 420 : 520}
          >
            <Popup className="map-gem-diamond-popup">
              <div dir="rtl" className="map-gem-diamond-popup__body">
                <p className="map-gem-diamond-popup__title">
                  {collected ? "יהלום — נאסף" : "יהלום נסתר"}
                </p>
                <p className="map-gem-diamond-popup__house">{house.name || house.address}</p>
                {!collected ? (
                  <p className="map-gem-diamond-popup__pet">{gemLabelHe(gemMonsterForHouse(house))}</p>
                ) : null}
                <p className="map-gem-diamond-popup__meta">
                  {calibrated ? "מיקום מותאם (טלפון)" : "מיקום אוטומטי ליד הסיכה"}
                </p>
              </div>
            </Popup>
          </Marker>
        </Fragment>
      ))}
    </>
  );
}
