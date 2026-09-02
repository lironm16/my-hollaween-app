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
  formatRouteSummary,
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
  const mapsUrl = route ? googleMapsWalkingUrl(route) : null;

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
            <SheetTitle className="text-lg font-semibold text-orange-50">המסלול שלכם</SheetTitle>
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
            לפי הסינון הנוכחי{prefsLabel ? ` · ${prefsLabel}` : ""}
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

              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    buttonVariants(),
                    "h-11 w-full bg-orange-500 text-black hover:bg-orange-400",
                  )}
                >
                  <Navigation className="size-4" />
                  ניווט רגלי ב־Google Maps
                  {route.stops.length > ROUTE_MAPS_MAX_STOPS
                    ? ` (עד ${ROUTE_MAPS_MAX_STOPS} עצירות)`
                    : ""}
                </a>
              ) : null}

              <ol className="space-y-2">
                {route.stops.map((stop) => (
                  <li key={stop.house.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectHouse(stop.house.id);
                        onOpenChange(false);
                      }}
                      className="flex w-full items-start gap-3 rounded-2xl bg-[#1d1028] p-3 text-start ring-1 ring-orange-500/15 transition hover:ring-orange-400/40"
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
                          {stop.order === 1 ? "מההתחלה" : `מעצירה קודמת`}:{" "}
                          {formatDistance(stop.fromPreviousMeters)}
                          {" · "}
                          מצטבר {formatDistance(stop.cumulativeMeters)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
