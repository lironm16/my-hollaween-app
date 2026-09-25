"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { SaveExportTrafficIcon } from "@/components/traffic-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  downloadHouseExport,
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
  /** Houses in the current map/list set before this export slice (usually full visible set scope). */
  totalInSet: number;
  activeFilterCount?: number;
  kind?: "liked" | "list" | "all";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<HouseExportFormat>("xlsx");
  const groupId = useId();
  const countMessage = exportHouseCountMessage(houses.length, totalInSet, activeFilterCount);

  function runExport(selected: HouseExportFormat) {
    if (houses.length === 0) {
      toast.error("אין בתים לשמירה — המפה ריקה");
      return;
    }
    downloadHouseExport(houses, kind, selected);
    const option = HOUSE_EXPORT_FORMAT_OPTIONS.find((row) => row.id === selected);
    toast.success(`נשמר קובץ ${option?.labelHe ?? selected} · ${houses.length} בתים`);
    setOpen(false);
  }

  function openDialog() {
    if (houses.length === 0) {
      toast.error("אין בתים לשמירה — המפה ריקה");
      return;
    }
    setOpen(true);
  }

  if (!label) {
    return (
      <>
        <button
          type="button"
          aria-label="שמירה"
          title="שמירת רשימת בתים"
          onClick={openDialog}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25"
        >
          <SaveExportTrafficIcon />
        </button>
        <ExportFormatDialog
          open={open}
          onOpenChange={setOpen}
          groupId={groupId}
          format={format}
          onFormatChange={setFormat}
          countMessage={countMessage}
          exportCount={houses.length}
          onConfirm={() => runExport(format)}
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
        <SaveExportTrafficIcon className="size-7 ring-0" />
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
        onConfirm={() => runExport(format)}
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
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  format: HouseExportFormat;
  onFormatChange: (format: HouseExportFormat) => void;
  countMessage: string;
  exportCount: number;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="gap-0 border border-orange-500/30 bg-[#1a0d24] p-0 text-orange-50 sm:max-w-md"
      >
        <DialogHeader className="border-b border-orange-500/15 px-4 py-3 pt-4 text-right">
          <DialogTitle className="font-display text-xl text-orange-200">שמירת רשימת בתים</DialogTitle>
          <DialogDescription className="text-base leading-snug text-violet-200/90">
            {countMessage}
          </DialogDescription>
        </DialogHeader>

        <fieldset className="border-0 px-4 py-3">
          <legend className="mb-2 text-sm font-semibold text-violet-200/90">פורמט הקובץ</legend>
          <div className="grid gap-2" role="radiogroup" aria-labelledby={`${groupId}-legend`}>
            {HOUSE_EXPORT_FORMAT_OPTIONS.map((option) => {
              const checked = format === option.id;
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex min-h-12 cursor-pointer touch-manipulation items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors",
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
                    className="mt-1 size-4 shrink-0 accent-orange-400"
                  />
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block text-base font-medium text-orange-50">{option.labelHe}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-violet-300/85">{option.hintHe}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <DialogFooter className="border-t border-orange-500/15 bg-[#14091c]/80 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="border-violet-500/40 text-violet-100"
            onClick={() => onOpenChange(false)}
          >
            ביטול
          </Button>
          <Button
            type="button"
            className="bg-orange-500 text-black hover:bg-orange-400"
            disabled={exportCount === 0}
            onClick={onConfirm}
          >
            שמירה לקובץ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
