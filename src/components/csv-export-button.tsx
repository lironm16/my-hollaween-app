"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import {
  downloadHouseExport,
  downloadOrShareHouseExport,
  downloadTxt,
  exportHouseCountMessage,
  routeToExportTxt,
  HOUSE_EXPORT_FORMAT_OPTIONS,
  type HouseExportFormat,
} from "@/lib/house-csv";
import {
  buildRouteShareUrl,
  shareRouteFromDialog,
  type ShareUrlOutcome,
} from "@/lib/route-share";
import type { WalkingRoute } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HouseExportDialog({
  open,
  onOpenChange,
  houses,
  totalInSet,
  activeFilterCount = 0,
  kind = "list",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  houses: PublicHouse[];
  totalInSet: number;
  activeFilterCount?: number;
  kind?: "liked" | "list" | "all";
}) {
  const [format, setFormat] = useState<HouseExportFormat>("xlsx");
  const groupId = useId();
  const countMessage = exportHouseCountMessage(houses.length, totalInSet, activeFilterCount);

  async function runExport(selected: HouseExportFormat) {
    if (houses.length === 0) {
      toast.error("אין בתים לשמירה — המפה ריקה");
      return;
    }
    if (selected === "txt") {
      await downloadOrShareHouseExport(houses, kind, selected, { preferShare: true });
    } else {
      downloadHouseExport(houses, kind, selected);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className="gap-0 overflow-hidden border border-orange-500/30 bg-[#1a0d24] p-0 text-orange-50 sm:max-w-md"
      >
        <OverlayCloseBar
          compact
          title="הורד מסלול"
          onClose={() => onOpenChange(false)}
          className="border-b border-orange-500/15 pb-2"
        />
        <div className="space-y-3 px-4 py-3">
          <p className="text-base leading-snug text-violet-200/90">{countMessage}</p>
          <fieldset className="border-0 p-0">
            <legend className="mb-2 text-sm font-semibold text-violet-200/90">פורמט</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="פורמט קובץ">
              {HOUSE_EXPORT_FORMAT_OPTIONS.map((option) => {
                const checked = format === option.id;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer touch-manipulation flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-colors",
                      checked
                        ? "border-orange-400/55 bg-orange-500/10 ring-1 ring-orange-400/35"
                        : "border-violet-500/25 bg-[#12081a]/80 hover:border-violet-400/35",
                    )}
                  >
                    <input
                      type="radio"
                      name={groupId}
                      value={option.id}
                      checked={checked}
                      onChange={() => setFormat(option.id)}
                      className="sr-only"
                    />
                    <span className="text-base font-medium text-orange-50">{option.labelHe}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-orange-500/15 bg-[#14091c]/80 px-4 py-3">
          <Button
            type="button"
            className="h-11 bg-orange-500 px-5 text-base text-black hover:bg-orange-400"
            disabled={houses.length === 0}
            onClick={() => void runExport(format)}
          >
            שמירה לקובץ
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 border-violet-500/40 px-5 text-base text-violet-100"
            onClick={() => onOpenChange(false)}
          >
            ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RouteShareDialog({
  open,
  onOpenChange,
  route,
  houses,
  totalInSet,
  activeFilterCount = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: WalkingRoute | null;
  houses: PublicHouse[];
  totalInSet: number;
  activeFilterCount?: number;
}) {
  const stopCount =
    route && route.stops.length > 0 ? route.stops.length : houses.length;
  const countMessage = exportHouseCountMessage(stopCount, totalInSet, activeFilterCount);

  function runShare() {
    const stopIds =
      route && route.stops.length > 0
        ? route.stops.map((stop) => stop.house.id)
        : houses.map((house) => house.id);
    if (stopIds.length === 0) {
      toast.error("אין בתים לשתף — הוסיפו בתים למסלול ונסו שוב");
      return;
    }
    const payload = { v: 1 as const, stopIds };
    const url = buildRouteShareUrl(payload, window.location.origin);
    const stopN = stopIds.length;
    const day = new Date().toISOString().slice(0, 10);
    const filename = `hallowhood-route-share-${day}.txt`;
    const linkBlock = `מסלול HallowHood · ${stopN} עצירות\n${url}`;
    const fullText =
      route && route.stops.length > 0
        ? `${linkBlock}\n\n${routeToExportTxt(route)}`
        : linkBlock;

    const finish = (outcome: ShareUrlOutcome) => {
      if (outcome === "shared") {
        toast.success("שיתוף המסלול נשלח");
        onOpenChange(false);
        return;
      }
      if (outcome === "copied") {
        toast.success("הקישור הועתק — הדביקו בוואטסאפ / הודעה");
        onOpenChange(false);
        return;
      }
      if (outcome === "downloaded") {
        toast.success("הקובץ ירד — אפשר לשתף ממנהל הקבצים / וואטסאפ");
        onOpenChange(false);
        return;
      }
      if (outcome === "cancelled") return;
      toast.error("לא הצלחנו לשתף — נסו שוב");
      toast.message(url, { closeButton: true, duration: 20_000 });
      onOpenChange(false);
    };

    const failOpen = () => {
      downloadTxt(filename, fullText);
      finish("downloaded");
    };

    shareRouteFromDialog({ url, stopCount: stopN, filename, fullText }, (outcome) => {
      if (outcome === "failed") {
        failOpen();
        return;
      }
      finish(outcome);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className="gap-0 overflow-hidden border border-orange-500/30 bg-[#1a0d24] p-0 text-orange-50 sm:max-w-md"
      >
        <OverlayCloseBar
          compact
          title="שתף מסלול"
          onClose={() => onOpenChange(false)}
          className="border-b border-orange-500/15 pb-2"
        />
        <div className="space-y-3 px-4 py-3">
          <p className="text-base leading-snug text-violet-200/90">{countMessage}</p>
          <p className="text-sm leading-relaxed text-violet-300/85">
            נשלח קישור לפתיחת המסלול באפליקציה (סדר העצירות נשמר). אפשר לשלוח בוואטסאפ, הודעה או
            לשמור לקובץ.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-orange-500/15 bg-[#14091c]/80 px-4 py-3">
          <Button
            type="button"
            className="h-11 bg-orange-500 px-5 text-base text-black hover:bg-orange-400"
            disabled={stopCount === 0}
            onClick={runShare}
          >
            שתף
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 border-violet-500/40 px-5 text-base text-violet-100"
            onClick={() => onOpenChange(false)}
          >
            ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
