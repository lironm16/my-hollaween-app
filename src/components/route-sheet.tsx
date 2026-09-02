"use client";

import { Footprints, Navigation, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDistance } from "@/lib/geo";
import { houseHeadline } from "@/lib/labels";
import { formatDisplayAddress } from "@/lib/config";
import {
  appleMapsWalkingUrl,
  formatRouteSummary,
  googleMapsNavigateUrl,
  googleMapsWalkingUrl,
  ROUTE_MAPS_MAX_STOPS,
  type WalkingRoute,
} from "@/lib/route";
import { cn } from "@/lib/utils";

export function RouteSheet({
  open,
  onOpenChange,
  route,
  prefsLabel,
  onSelectHouse,
  onRequestLocation,
  hasGps,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: WalkingRoute | null;
  prefsLabel: string;
  onSelectHouse: (id: string) => void;
  onRequestLocation?: () => void;
  hasGps: boolean;
}) {
  const accessible = Boolean(route?.accessible);
  const overviewUrl = route ? googleMapsWalkingUrl(route) : null;
  const firstStop = route?.stops[0]?.house;
  const navigateFirstUrl =
    route && firstStop
      ? googleMapsNavigateUrl(route.origin, { lat: firstStop.lat, lng: firstStop.lng })
      : null;
  const appleFirstUrl =
    route && firstStop
      ? appleMapsWalkingUrl(route.origin, { lat: firstStop.lat, lng: firstStop.lng })
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex h-[min(92vh,720px)] max-h-[92vh] flex-col gap-0 overflow-hidden rounded-t-2xl border-orange-500/25 bg-[#160b1f] p-0 sm:max-w-none"
      >
        <SheetHeader className="shrink-0 border-b border-orange-500/15 px-4 py-3">
          <div className="flex items-center gap-2">
            <Footprints className="size-5 text-orange-300" />
            <SheetTitle className="text-lg font-semibold text-orange-50">
              {accessible ? "המסלול הנגיש שלכם" : "המסלול שלכם"}
            </SheetTitle>
            <button
              type="button"
              aria-label="סגירה"
              onClick={() => onOpenChange(false)}
              className="ms-auto inline-flex size-9 items-center justify-center rounded-lg text-orange-100 hover:bg-orange-500/10"
            >
              <X className="size-5" />
            </button>
          </div>
          <p className="text-start text-xs text-violet-300">
            לפי הסינון הנוכחי{prefsLabel ? ` · ${prefsLabel}` : ""} · הליכה בלבד
          </p>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {!route ? (
            <div className="rounded-2xl bg-[#1d1028] p-4 text-sm text-violet-200 ring-1 ring-orange-500/20">
              אין בתים שמתאימים לסינון. שנו את הפילטרים ואז בנו מסלול שוב.
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20">
                <p className="text-sm font-medium text-orange-100">{formatRouteSummary(route)}</p>
                <p className="mt-1 text-xs text-violet-300">
                  {route.startedFrom === "gps"
                    ? "מתחילים מהמיקום שלכם"
                    : "אין GPS — מתחילים ממרכז השכונה"}
                  {accessible ? " · זמן מותאם לנגישות" : ""}
                </p>
                {!hasGps && onRequestLocation ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={onRequestLocation}
                  >
                    <Navigation className="size-3.5" />
                    הפעילו מיקום לדיוק טוב יותר
                  </Button>
                ) : null}
              </div>

              <div className="space-y-2">
                {navigateFirstUrl ? (
                  <a
                    href={navigateFirstUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants(),
                      "h-11 w-full bg-orange-500 text-black hover:bg-orange-400",
                    )}
                  >
                    <Navigation className="size-4" />
                    התחל הליכה לעצירה 1
                  </a>
                ) : null}
                {overviewUrl ? (
                  <a
                    href={overviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full")}
                  >
                    כל המסלול בהליכה (עד {Math.min(route.stops.length, ROUTE_MAPS_MAX_STOPS)} עצירות)
                  </a>
                ) : null}
                {appleFirstUrl ? (
                  <a
                    href={appleFirstUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ variant: "ghost" }), "h-10 w-full text-orange-200")}
                  >
                    הליכה ב־Apple Maps לעצירה 1
                  </a>
                ) : null}
                <p className="text-[11px] text-violet-400">
                  מומלץ: «התחל הליכה» — פותח ניווט רגלי בגוגל מפות. אם נפתח מצב רכב בטעות, לחצו על אייקון ההליכה
                  במפות, או השתמשו ב־Apple Maps.
                </p>
              </div>

              <ol className="space-y-2">
                {route.stops.map((stop, index) => {
                  const prev =
                    index === 0
                      ? route.origin
                      : {
                          lat: route.stops[index - 1]!.house.lat,
                          lng: route.stops[index - 1]!.house.lng,
                        };
                  const stepUrl = googleMapsNavigateUrl(prev, {
                    lat: stop.house.lat,
                    lng: stop.house.lng,
                  });
                  const appleStep = appleMapsWalkingUrl(prev, {
                    lat: stop.house.lat,
                    lng: stop.house.lng,
                  });
                  return (
                    <li key={stop.house.id}>
                      <div className="rounded-2xl bg-[#1d1028] p-3 ring-1 ring-orange-500/15">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectHouse(stop.house.id);
                            onOpenChange(false);
                          }}
                          className="flex w-full items-start gap-3 text-start"
                        >
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-black">
                            {stop.order}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-orange-100">
                              {houseHeadline(stop.house)}
                            </span>
                            <span className="mt-0.5 block text-xs text-violet-300">
                              {formatDisplayAddress(stop.house)}
                            </span>
                            <span className="mt-1 block text-[11px] text-violet-400">
                              {stop.order === 1 ? "מההתחלה" : "מעצירה קודמת"}:{" "}
                              {formatDistance(stop.fromPreviousMeters)}
                              {" · "}
                              מצטבר {formatDistance(stop.cumulativeMeters)}
                            </span>
                          </span>
                        </button>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          <a
                            href={stepUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-orange-300 underline-offset-2 hover:underline"
                          >
                            הליכה לכאן (Google)
                          </a>
                          <a
                            href={appleStep}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-violet-300 underline-offset-2 hover:underline"
                          >
                            Apple Maps
                          </a>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
