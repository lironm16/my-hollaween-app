"use client";

import { Navigation } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { HoursStatusBanner } from "@/components/hours-status-banner";
import { ListStatusLabels } from "@/components/house-list";
import { formatDisplayAddress } from "@/lib/config";
import { formatDistance } from "@/lib/geo";
import { houseHeadline } from "@/lib/labels";
import { googleMapsNavigateUrl, type WalkingRoute } from "@/lib/route";
import { cn } from "@/lib/utils";

export function RouteList({
  route,
  hasGps,
  onRequestLocation,
  onSelectHouse,
  statusText,
}: {
  route: WalkingRoute | null;
  hasGps: boolean;
  onRequestLocation?: () => void;
  onSelectHouse: (id: string) => void;
  statusText: string;
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
        <div className="mb-3">
          <ListStatusLabels statusText={statusText} extra={gpsAction} />
        </div>
        <p className="font-display text-2xl text-orange-300">אין עצירות במסלול</p>
        <p className="mt-2 text-base">
          שנו סינון כדי לראות בתים במסלול. «לא ביקרתי» מסתיר בתים שכבר סימנתם.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-3 py-3">
      <ListStatusLabels statusText={statusText} extra={gpsAction} />

      <ol className="space-y-2">
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
            <li key={house.id} className="rounded-2xl bg-[#1d1028] p-3 ring-1 ring-orange-500/15">
              <HoursStatusBanner house={house} className="mb-2" />
              <button
                type="button"
                onClick={() => onSelectHouse(house.id)}
                className="flex w-full items-start gap-3 text-start"
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
                  <span className="mt-1 block text-base text-violet-400">
                    {houseIndex > 0
                      ? "אותו בניין"
                      : `${stop.order === 1 ? "מההתחלה" : "מעצירה קודמת"}: ${formatDistance(stop.fromPreviousMeters)} · מצטבר ${formatDistance(stop.cumulativeMeters)}`}
                  </span>
                </span>
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={walkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ size: "sm" }), "bg-orange-500 text-black hover:bg-orange-400")}
                >
                  <Navigation className="size-3.5" />
                  ניווט לכאן
                </a>
              </div>
            </li>
          ));
        })}
      </ol>
    </div>
  );
}
