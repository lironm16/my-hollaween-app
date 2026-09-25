"use client";

import { useId, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import {
  downloadHouseExport,
  downloadOrShareHouseExport,
  exportHouseCountMessage,
  HOUSE_EXPORT_FORMAT_OPTIONS,
  type HouseExportFormat,
} from "@/lib/house-csv";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CsvExportButton({
  houses,
  totalInSet,
  activeFilterCount = 0,
  kind = "list",
  label,
}: {
  houses: PublicHouse[];
  totalInSet: number;
  activeFilterCount?: number;
  kind?: "liked" | "list" | "all";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
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
    const option = HOUSE_EXPORT_FORMAT_OPTIONS.find((row) => row.id === selected);
    toast.success(`נשמר ${option?.labelHe ?? selected} · ${houses.length} בתים`);
    setOpen(false);
  }

  function openDialog() {
    if (houses.length === 0) {
      toast.error("אין בתים לשמירה — המפה ריקה");
      return;
    }
    setOpen(true);
  }

  const triggerClass =
    "app-toolbar__btn inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25";

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className="gap-0 overflow-hidden border border-orange-500/30 bg-[#1a0d24] p-0 text-orange-50 sm:max-w-md"
      >
        <OverlayCloseBar
          compact
          title="הורדת רשימה"
          onClose={() => setOpen(false)}
          className="border-b border-orange-500/15 pb-2"
        />
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
            onClick={() => setOpen(false)}
          >
            ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (!label) {
    return (
      <>
        <button
          type="button"
          aria-label="הורדת רשימה"
          title="הורדת רשימה"
          onClick={openDialog}
          className={triggerClass}
        >
          <Download className="size-5" strokeWidth={2.25} />
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
        <Download className="size-4" strokeWidth={2.25} />
        {label}
      </Button>
      {dialog}
    </>
  );
}
