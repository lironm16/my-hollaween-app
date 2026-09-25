"use client";

import { useEffect, useId, useState } from "react";
import { Link2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverlayCloseBar } from "@/components/overlay-close-button";
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
  shareRouteUrl,
  sharedRoutePayloadFromRoute,
} from "@/lib/route-share";
import type { WalkingRoute } from "@/lib/route";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

type SaveSharePanel = "list" | "route";

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
  const [panel, setPanel] = useState<SaveSharePanel>("list");
  const groupId = useId();
  const countMessage = exportHouseCountMessage(houses.length, totalInSet, activeFilterCount);
  const canShareRoute = Boolean(routeMode && activeRoute && activeRoute.stops.length > 0);
  const listExportEnabled = houses.length > 0;

  useEffect(() => {
    if (!open) return;
    if (canShareRoute && !listExportEnabled) setPanel("route");
    else setPanel("list");
  }, [open, canShareRoute, listExportEnabled]);

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

  function shareRouteLink() {
    if (!activeRoute || activeRoute.stops.length === 0) {
      toast.error("אין מסלול פעיל לשיתוף");
      return;
    }
    const stopCount = activeRoute.stops.length;
    const url = buildRouteShareUrl(
      sharedRoutePayloadFromRoute(activeRoute),
      window.location.origin,
    );
    void shareRouteUrl(url, stopCount)
      .then((outcome) => {
        if (outcome === "shared") {
          toast.success("שיתוף המסלול נשלח");
          setOpen(false);
          return;
        }
        if (outcome === "copied") {
          toast.success("הקישור הועתק — הדביקו בוואטסאפ / הודעה");
          setOpen(false);
          return;
        }
        if (outcome === "cancelled") return;
        toast.error("לא הצלחנו לשתף — נסו שוב");
        toast.message(url, { closeButton: true, duration: 20_000 });
      })
      .catch(() => {
        toast.error("לא הצלחנו לשתף — נסו שוב");
      });
  }

  async function saveRouteTxt() {
    if (!activeRoute) return;
    await downloadOrShareRouteTxt(activeRoute, true);
    toast.success("מסלול נשמר / שותף");
    setOpen(false);
  }

  function openDialog() {
    if (!listExportEnabled && !canShareRoute) {
      toast.error("אין בתים לשמירה — המפה ריקה");
      return;
    }
    setOpen(true);
  }

  const triggerClass =
    "app-toolbar__btn inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25";

  const dialog = (
    <ExportFormatDialog
      open={open}
      onOpenChange={setOpen}
      groupId={groupId}
      format={format}
      onFormatChange={setFormat}
      panel={panel}
      onPanelChange={setPanel}
      countMessage={countMessage}
      exportCount={houses.length}
      canShareRoute={canShareRoute}
      routeStopCount={activeRoute?.stops.length ?? 0}
      onConfirm={() => void runExport(format)}
      onShareRoute={shareRouteLink}
      onSaveRouteTxt={() => void saveRouteTxt()}
    />
  );

  if (!label) {
    return (
      <>
        <button type="button" aria-label="שמירה" title="שמירה ושיתוף" onClick={openDialog} className={triggerClass}>
          <Save className="size-5" strokeWidth={2.25} />
        </button>
        {dialog}
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
      {dialog}
    </>
  );
}

function ExportFormatDialog({
  open,
  onOpenChange,
  groupId,
  format,
  onFormatChange,
  panel,
  onPanelChange,
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
  panel: SaveSharePanel;
  onPanelChange: (panel: SaveSharePanel) => void;
  countMessage: string;
  exportCount: number;
  canShareRoute: boolean;
  routeStopCount: number;
  onConfirm: () => void;
  onShareRoute: () => void;
  onSaveRouteTxt: () => void;
}) {
  const showTabs = canShareRoute;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className="gap-0 overflow-hidden border border-orange-500/30 bg-[#1a0d24] p-0 text-orange-50 sm:max-w-md"
      >
        <OverlayCloseBar
          compact
          title="שמירה ושיתוף"
          onClose={() => onOpenChange(false)}
          className="border-b border-orange-500/15 pb-2"
        />

        {showTabs ? (
          <Tabs
            value={panel}
            onValueChange={(value) => onPanelChange(value as SaveSharePanel)}
            className="gap-0"
          >
            <TabsList className="mx-4 mt-3 grid h-10 w-[calc(100%-2rem)] grid-cols-2 rounded-xl bg-[#12081a] p-1 ring-1 ring-violet-500/25">
              <TabsTrigger
                value="list"
                className="h-8 rounded-lg text-base data-active:bg-orange-500/20 data-active:text-orange-100"
              >
                רשימת בתים
              </TabsTrigger>
              <TabsTrigger
                value="route"
                className="h-8 rounded-lg text-base data-active:bg-amber-500/20 data-active:text-amber-100"
              >
                מסלול ({routeStopCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-0 outline-none">
              <ListExportPanel
                groupId={groupId}
                format={format}
                onFormatChange={onFormatChange}
                countMessage={countMessage}
                exportCount={exportCount}
                onConfirm={onConfirm}
                onCancel={() => onOpenChange(false)}
              />
            </TabsContent>

            <TabsContent value="route" className="mt-0 outline-none">
              <RouteSharePanel
                routeStopCount={routeStopCount}
                onShareRoute={onShareRoute}
                onSaveRouteTxt={onSaveRouteTxt}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <ListExportPanel
            groupId={groupId}
            format={format}
            onFormatChange={onFormatChange}
            countMessage={countMessage}
            exportCount={exportCount}
            onConfirm={onConfirm}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ListExportPanel({
  groupId,
  format,
  onFormatChange,
  countMessage,
  exportCount,
  onConfirm,
  onCancel,
}: {
  groupId: string;
  format: HouseExportFormat;
  onFormatChange: (format: HouseExportFormat) => void;
  countMessage: string;
  exportCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="space-y-3 px-4 py-3">
        <p className="text-base leading-snug text-violet-200/90">{countMessage}</p>
        <fieldset className="border-0 p-0">
          <legend className="mb-2 text-sm font-semibold text-violet-200/90">פורמט</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="פורמט קובץ">
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
                    onChange={() => onFormatChange(option.id)}
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
          disabled={exportCount === 0}
          onClick={onConfirm}
        >
          שמירה לקובץ
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 border-violet-500/40 px-5 text-base text-violet-100"
          onClick={onCancel}
        >
          ביטול
        </Button>
      </div>
    </>
  );
}

function RouteSharePanel({
  routeStopCount,
  onShareRoute,
  onSaveRouteTxt,
}: {
  routeStopCount: number;
  onShareRoute: () => void;
  onSaveRouteTxt: () => void;
}) {
  return (
    <div className="space-y-3 px-4 py-3 pb-4">
      <p className="text-base leading-snug text-violet-200/90">
        {routeStopCount} עצירות — אותם מספרי בתים בכל מכשיר. פותחים את הקישור → «החלפת מסלול».
      </p>
      <button
        type="button"
        className="inline-flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-lg bg-orange-500 text-lg font-medium text-black hover:bg-orange-400 active:translate-y-px"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onShareRoute();
        }}
      >
        <Link2 className="size-5 shrink-0 pointer-events-none" aria-hidden />
        שיתוף קישור למסלול
      </button>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full border-violet-500/40 text-base text-violet-100"
        onClick={onSaveRouteTxt}
      >
        שמירה כטקסט (יומן / Notes)
      </Button>
    </div>
  );
}
