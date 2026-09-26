"use client";

import { useRef, useState } from "react";
import { ChevronDown, Route, Save, Share2 } from "lucide-react";
import { toast } from "sonner";
import { HouseExportDialog } from "@/components/csv-export-button";
import { sharePlainTextFile } from "@/lib/house-csv";
import {
  buildRouteShareUrl,
  routeSharePlainText,
  shareRouteUrl,
  sharedRoutePayloadFromRoute,
} from "@/lib/route-share";
import { readMenuSectionOpen, writeMenuSectionOpen } from "@/lib/menu-section-state";
import type { WalkingRoute } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const subLinkClass = cn(
  buttonVariants({ variant: "ghost", size: "lg" }),
  "h-10 justify-start gap-2 ps-[4.5rem] text-base text-orange-50 hover:bg-orange-500/10",
);

export function RouteMenuSection({
  houses,
  totalInSet,
  activeFilterCount = 0,
  activeRoute,
  kind = "list",
  onNavigate,
}: {
  houses: PublicHouse[];
  totalInSet: number;
  activeFilterCount?: number;
  activeRoute: WalkingRoute | null;
  kind?: "liked" | "list" | "all";
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(() => readMenuSectionOpen("route", false));
  const [exportOpen, setExportOpen] = useState(false);
  const activeRouteRef = useRef(activeRoute);
  activeRouteRef.current = activeRoute;

  function openExportDialog() {
    onNavigate?.();
    setExportOpen(true);
  }

  function shareRoute() {
    onNavigate?.();
    const route = activeRouteRef.current;
    if (!route || route.stops.length === 0) {
      toast.message("אין עצירות במסלול — הוסיפו בתים למסלול ונסו שוב");
      return;
    }

    const url = buildRouteShareUrl(
      sharedRoutePayloadFromRoute(route),
      window.location.origin,
    );
    const stopCount = route.stops.length;
    const text = routeSharePlainText(url, stopCount);
    const day = new Date().toISOString().slice(0, 10);
    const title = "מסלול HallowHood";

    const runFallback = () => {
      void (async () => {
        const fileShared = await sharePlainTextFile(
          `hallowhood-route-share-${day}.txt`,
          text,
          title,
        );
        if (fileShared) {
          toast.success("שיתוף המסלול נשלח");
          return;
        }
        const outcome = await shareRouteUrl(url, stopCount);
        if (outcome === "shared" || outcome === "copied") {
          toast.success(
            outcome === "shared"
              ? "שיתוף המסלול נשלח"
              : "הקישור הועתק — הדביקו בוואטסאפ / הודעה",
          );
          return;
        }
        if (outcome === "cancelled") return;
        toast.error("לא הצלחנו לשתף — נסו שוב");
        toast.message(url, { closeButton: true, duration: 20_000 });
      })();
    };

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      navigator
        .share({ title, text: text.slice(0, 8000) })
        .then(() => toast.success("שיתוף המסלול נשלח"))
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          runFallback();
        });
      return;
    }
    runFallback();
  }

  return (
    <>
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() =>
            setOpen((value) => {
              const next = !value;
              writeMenuSectionOpen("route", next);
              return next;
            })
          }
          className={cn(
            buttonVariants({ variant: "ghost", size: "lg" }),
            "h-11 justify-start gap-2 text-base text-orange-50 hover:bg-orange-500/10",
          )}
        >
          <Route className="size-4" />
          <span className="flex-1 text-start">מסלול</span>
          <ChevronDown
            className={cn("size-4 shrink-0 text-violet-400 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
        {open ? (
          <div className="ms-5 flex flex-col gap-0.5 border-s border-orange-500/25 ps-3">
            <button type="button" onClick={openExportDialog} className={subLinkClass}>
              <Save className="size-4" strokeWidth={2.25} />
              הורד
            </button>
            <button type="button" onClick={shareRoute} className={subLinkClass}>
              <Share2 className="size-4" />
              שתף
            </button>
          </div>
        ) : null}
      </div>
      <HouseExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        houses={houses}
        totalInSet={totalInSet}
        activeFilterCount={activeFilterCount}
        kind={kind}
      />
    </>
  );
}
