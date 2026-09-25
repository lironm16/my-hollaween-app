"use client";

import { useId, useState } from "react";
import { Route, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  downloadHouseExport,
  downloadOrShareHouseExport,
  downloadOrShareRouteTxt,
  exportHouseCountMessage,
  HOUSE_EXPORT_FORMAT_OPTIONS,
  type HouseExportFormat,
} from "@/lib/house-csv";
import {
  buildRouteShareUrl,
  sharedRoutePayloadFromRoute,
} from "@/lib/route-share";
import type { WalkingRoute } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CsvExportButton({
  houses,
  totalInSet,
  activeFilterCount = 0,
  kind = "list",
  label,
  routeMode = false,
  activeRoute = null,
}: {
  houses: PublicHouse[];
  totalInSet: number;
  activeFilterCount?: number;
  kind?: "liked" | "list" | "all";
  label?: string;
  routeMode?: boolean;
  activeRoute?: WalkingRoute | null;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<HouseExportFormat>("xlsx");
  const groupId = useId();
  const countMessage = exportHouseCountMessage(houses.length, totalInSet, activeFilterCount);
  const canShareRoute = routeMode && activeRoute && activeRoute.stops.length > 0;

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
    const option = HOUSE_EXPORT_FORMAT_OPTIONS.find((row) => row.id === selected);
    toast.success(`נשמר ${option?.labelHe ?? selected} · ${houses.length} בתים`);
    setOpen(false);
  }

  async function shareRouteLink() {
    if (!activeRoute) return;
    const payload = sharedRoutePayloadFromRoute(activeRoute);
    const url =
      typeof window !== "undefined"
        ? buildRouteShareUrl(payload, window.location.origin)
        : buildRouteShareUrl(payload);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "מסלול HallowHood",
          text: `מסלול עם ${payload.stopIds.length} עצירות — מספרים קבועים`,
          url,
        });
        toast.success("שיתוף המסלול נשלח");
        setOpen(false);
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("קישור המסלול הועתק");
    } catch {
      toast.message(url);
    }
  }

  async function saveRouteTxt() {
    if (!activeRoute) return;
    await downloadOrShareRouteTxt(activeRoute, true);
    toast.success("מסלול נשמר / שותף");
  }

  function openDialog() {
    if (houses.length === 0 && !canShareRoute) {
      toast.error("אין בתים לשמירה — המפה ריקה");
      return;
    }
    setOpen(true);
  }

  const triggerClass =
    "app-toolbar__btn inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25";

  if (!label) {
    return (
      <>
        <button type="button" aria-label="שמירה" title="שמירה ושיתוף" onClick={openDialog} className={triggerClass}>
          <Save className="size-5" strokeWidth={2.25} />
        </button>
        <ExportFormatDialog
          open={open}
          onOpenChange={setOpen}
          groupId={groupId}
          format={format}
          onFormatChange={setFormat}
          countMessage={countMessage}
          exportCount={houses.length}
          canShareRoute={canShareRoute}
          routeStopCount={activeRoute?.stops.length ?? 0}
          onConfirm={() => void runExport(format)}
          onShareRoute={() => void shareRouteLink()}
          onSaveRouteTxt={() => void saveRouteTxt()}
        />
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-orange-400/40 text-orange-100"
        onClick={openDialog}
      >
        <Save className="size-4" strokeWidth={2.25} />
        {label}
      </Button>
      <ExportFormatDialog
        open={open}
        onOpenChange={setOpen}
        groupId={groupId}
        format={format}
        onFormatChange={setFormat}
        countMessage={countMessage}
        exportCount={houses.length}
        canShareRoute={canShareRoute}
        routeStopCount={activeRoute?.stops.length ?? 0}
        onConfirm={() => void runExport(format)}
        onShareRoute={() => void shareRouteLink()}
        onSaveRouteTxt={() => void saveRouteTxt()}
      />
    </>
  );
}

function ExportFormatDialog({
  open,
  onOpenChange,
  groupId,
  format,
  onFormatChange,
  countMessage,
  exportCount,
  canShareRoute,
  routeStopCount,
  onConfirm,
  onShareRoute,
  onSaveRouteTxt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  format: HouseExportFormat;
  onFormatChange: (format: HouseExportFormat) => void;
  countMessage: string;
  exportCount: number;
  canShareRoute: boolean | null | undefined;
  routeStopCount: number;
  onConfirm: () => void;
  onShareRoute: () => void;
  onSaveRouteTxt: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="gap-0 border border-orange-500/30 bg-[#1a0d24] p-0 text-orange-50 sm:max-w-md"
      >
        <DialogHeader className="border-b border-orange-500/15 px-4 py-3 pt-4 text-center">
          <DialogTitle className="font-display text-xl text-orange-200">שמירה ושיתוף</DialogTitle>
        </DialogHeader>

        <fieldset className="border-0 px-4 py-3">
          <p className="mb-3 text-base leading-snug text-violet-200/90">{countMessage}</p>
          <legend className="mb-2 text-sm font-semibold text-violet-200/90">רשימת בתים — פורמט</legend>
          <div className="grid gap-2" role="radiogroup">
            {HOUSE_EXPORT_FORMAT_OPTIONS.map((option) => {
              const checked = format === option.id;
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex min-h-11 cursor-pointer touch-manipulation items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
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
                    onChange={() => onFormatChange(option.id)}
                    className="size-4 shrink-0 accent-orange-400"
                  />
                  <span className="min-w-0 flex-1 text-start text-base font-medium text-orange-50">
                    {option.labelHe}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {canShareRoute ? (
          <div className="border-t border-orange-500/15 px-4 py-3">
            <p className="mb-2 text-sm font-semibold text-violet-200/90">מסלול פעיל ({routeStopCount} עצירות)</p>
            <p className="mb-3 text-sm leading-snug text-violet-300/85">
              «שיתוף קישור» שולח קישור לאפליקציה (וואטסאפ, אווירדרופ, הודעה לעצמכם). במכשיר השני
              פותחים את הקישור — מופיעה «החלפת מסלול» — אותם מספרי בתים; הניווט מנקודת ההתחלה שלכם.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2 border-amber-400/45 text-amber-100"
                onClick={onShareRoute}
              >
                <Route className="size-4 shrink-0" aria-hidden />
                שיתוף קישור למסלול
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-violet-200"
                onClick={onSaveRouteTxt}
              >
                שמירת המסלול כקובץ טקסט (Notes / יומן)
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 border-t border-orange-500/15 bg-[#14091c]/80 px-4 py-3">
          <Button
            type="button"
            className="h-11 bg-orange-500 px-5 text-base text-black hover:bg-orange-400"
            disabled={exportCount === 0}
            onClick={onConfirm}
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
