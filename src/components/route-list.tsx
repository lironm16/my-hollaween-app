"use client";

import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoursStatusBanner } from "@/components/hours-status-banner";
import { HouseTags } from "@/components/house-tags";
import { formatDisplayAddress } from "@/lib/config";
import { formatDistance } from "@/lib/geo";
import { houseHeadline } from "@/lib/labels";
import { googleMapsNavigateUrl, type WalkingRoute } from "@/lib/route";

function RouteLeg({ label }: { label: string }) {
  return (
    <div className="route-list-leg">
      <span className="route-list-leg-line" aria-hidden="true" />
      <span className="route-list-leg-label">{label}</span>
    </div>
  );
}

export function RouteList({
  route,
  hasGps,
  onRequestLocation,
  onSelectHouse,
  selectedId,
}: {
  route: WalkingRoute | null;
  hasGps: boolean;
  onRequestLocation?: () => void;
  onSelectHouse: (id: string) => void;
  selectedId?: string | null;
}) {
  const gpsAction =
    !hasGps && onRequestLocation ? (
      <Button type="button" size="sm" variant="outline" className="mt-2" onClick={onRequestLocation}>
        <Navigation className="size-3.5" />
        הפעילו מיקום
      </Button>
    ) : null;

  if (!route) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-violet-200">
        {gpsAction}
        <p className="font-display text-2xl text-orange-300">אין עצירות במסלול</p>
        <p className="mt-2 text-base">
          שנו סינון כדי לראות בתים במסלול. «לא ביקרתי» מסתיר בתים שכבר סימנתם.
        </p>
      </div>
    );
  }

  const startLabel = route.originLabel || (route.startedFrom === "gps" ? "מיקום נוכחי" : "ממרכז השכונה");

  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col px-3 py-3"
      style={selectedId ? { paddingBottom: "calc(var(--map-sheet-h, 70dvh) + 1rem)" } : undefined}
    >
      <ol className="route-list">
        <li className="route-list-card">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black">
              <MapPin className="size-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium text-orange-100">נקודת התחלה</p>
              <p className="mt-0.5 text-base text-violet-300">{startLabel}</p>
              {gpsAction}
            </div>
          </div>
        </li>
        {route.stops.flatMap((stop, index) => {
          const prev =
            index === 0
              ? route.origin
              : {
                  lat: route.stops[index - 1]!.house.lat,
                  lng: route.stops[index - 1]!.house.lng,
                };
          const walkUrl = googleMapsNavigateUrl(prev, {
            lat: stop.house.lat,
            lng: stop.house.lng,
          });
          return stop.houses.map((house, houseIndex) => (
            <li key={house.id}>
              <RouteLeg
                label={
                  houseIndex > 0
                    ? "אותו בניין"
                    : formatDistance(stop.fromPreviousMeters)
                }
              />
              <div className="route-list-card">
                <HoursStatusBanner house={house} className="mb-2" />
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectHouse(house.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-start"
                  >
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-base font-bold text-black">
                      {stop.order}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-medium text-orange-100">
                        {houseHeadline(house)}
                      </span>
                      <span className="mt-0.5 block text-base text-violet-300">
                        {formatDisplayAddress(house)}
                      </span>
                      {house.arrival ? (
                        <span className="mt-0.5 block text-base text-amber-200/90">{house.arrival}</span>
                      ) : null}
                      <span className="mt-2 block">
                        <HouseTags house={house} large />
                      </span>
                    </span>
                  </button>
                  <a
                    href={walkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="house-action-btn shrink-0"
                    aria-label="ניווט לכאן"
                    title="ניווט לכאן"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Navigation className="size-6" strokeWidth={2.2} />
                  </a>
                </div>
              </div>
            </li>
          ));
        })}
      </ol>
    </div>
  );
}
