"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { HelpText } from "@/components/help-text";
import { useLocale } from "@/hooks/use-locale";
import {
  localizedExportHouseCountMessage,
  exportFormatLabel,
} from "@/lib/i18n/export-copy";
import {
  downloadHouseExport,
  downloadOrShareHouseExport,
  HOUSE_EXPORT_FORMAT_OPTIONS,
  type HouseExportFormat,
} from "@/lib/house-csv";
import {
  buildRouteShareUrl,
  startRouteShare,
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
  const { dir, locale, t } = useLocale();
  const [format, setFormat] = useState<HouseExportFormat>("xlsx");
  const groupId = useId();
  const countMessage = localizedExportHouseCountMessage(
    locale,
    houses.length,
    totalInSet,
    activeFilterCount,
  );

  async function runExport(selected: HouseExportFormat) {
    if (houses.length === 0) {
      toast.error(t("houseExport.emptyExport"));
      return;
    }
    if (selected === "txt") {
      await downloadOrShareHouseExport(houses, kind, selected, { preferShare: true, locale });
    } else {
      downloadHouseExport(houses, kind, selected);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={dir}
        showCloseButton={false}
        className="gap-0 overflow-hidden border border-orange-500/30 bg-[#1a0d24] p-0 text-orange-50 sm:max-w-md"
      >
        <OverlayCloseBar
          compact
          title={t("houseExport.downloadTitle")}
          onClose={() => onOpenChange(false)}
          className="border-b border-orange-500/15 pb-2"
        />
        <div className="space-y-3 px-4 py-3">
          <p className="text-base leading-snug text-violet-200/90">{countMessage}</p>
          <fieldset className="border-0 p-0">
            <legend className="mb-2 text-sm font-semibold text-violet-200/90">
              {t("houseExport.formatLegend")}
            </legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("houseExport.formatAria")}>
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
                    <span className="text-base font-medium text-orange-50">
                      {exportFormatLabel(locale, option.id)}
                    </span>
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
            {t("houseExport.saveToFile")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 border-violet-500/40 px-5 text-base text-violet-100"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
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
  const { dir, locale, t } = useLocale();
  const stopCount =
    route && route.stops.length > 0 ? route.stops.length : houses.length;
  const countMessage = localizedExportHouseCountMessage(
    locale,
    stopCount,
    totalInSet,
    activeFilterCount,
  );

  function runShare() {
    const stopIds =
      route && route.stops.length > 0
        ? route.stops.map((stop) => stop.house.id)
        : houses.map((house) => house.id);
    if (stopIds.length === 0) {
      toast.error(t("houseExport.shareEmpty"));
      return;
    }
    const payload = { v: 1 as const, stopIds };
    const url = buildRouteShareUrl(payload, window.location.origin);
    const stopN = stopIds.length;

    const finish = (outcome: ShareUrlOutcome) => {
      if (outcome === "shared") {
        toast.success(t("houseExport.shareSent"));
        onOpenChange(false);
        return;
      }
      if (outcome === "copied") {
        toast.success(t("houseExport.shareCopied"));
        onOpenChange(false);
        return;
      }
      if (outcome === "cancelled") return;
      toast.error(t("houseExport.shareFailed"));
      toast.message(url, { closeButton: true, duration: 20_000 });
      onOpenChange(false);
    };

    startRouteShare(url, stopN, finish);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={dir}
        showCloseButton={false}
        className="gap-0 overflow-hidden border border-orange-500/30 bg-[#1a0d24] p-0 text-orange-50 sm:max-w-md"
      >
        <OverlayCloseBar
          compact
          title={t("houseExport.shareTitle")}
          onClose={() => onOpenChange(false)}
          className="border-b border-orange-500/15 pb-2"
        />
        <div className="space-y-3 px-4 py-3">
          <p className="text-base leading-snug text-violet-200/90">{countMessage}</p>
          <p className="text-sm leading-relaxed text-violet-300/85">
            <HelpText>{t("houseExport.shareBody")}</HelpText>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-orange-500/15 bg-[#14091c]/80 px-4 py-3">
          <Button
            type="button"
            className="h-11 bg-orange-500 px-5 text-base text-black hover:bg-orange-400"
            disabled={stopCount === 0}
            onClick={runShare}
          >
            {t("houseExport.shareAction")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 border-violet-500/40 px-5 text-base text-violet-100"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
