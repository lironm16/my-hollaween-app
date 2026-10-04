"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import {
  downloadAdminHouseExport,
  type AdminHouseDownloadFormat,
} from "@/lib/admin-house-download";
import { cn } from "@/lib/utils";

const FORMAT_OPTIONS: ReadonlyArray<{ id: AdminHouseDownloadFormat; labelHe: string; hint: string }> =
  [
    {
      id: "json",
      labelHe: "JSON (גיבוי מלא)",
      hint: "כולל כתובות, טלפון, קוד עריכה",
    },
    {
      id: "xlsx",
      labelHe: "טבלה (Excel)",
      hint: "רשימה לעריכה / הדפסה",
    },
    {
      id: "csv",
      labelHe: "CSV",
      hint: "טקסט מופרד בפסיקים",
    },
  ];

export function AdminHouseDownloadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [format, setFormat] = useState<AdminHouseDownloadFormat>("json");
  const [busy, setBusy] = useState(false);
  const groupId = useId();

  async function runDownload() {
    setBusy(true);
    try {
      await downloadAdminHouseExport(format);
      toast.success("הקובץ ירד למכשיר");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "לא הצלחנו להוריד");
    } finally {
      setBusy(false);
    }
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
          title="הורדת רשימת בתים"
          onClose={() => onOpenChange(false)}
          className="border-b border-orange-500/15 pb-2"
        />
        <div className="space-y-3 px-4 py-3">
          <p className="text-sm leading-relaxed text-violet-200/90">
            גיבוי מלא מהשרת — למנהלים בלבד. שמרו קובץ לפני שינויים גדולים ב־Firestore.
          </p>
          <fieldset className="border-0 p-0">
            <legend className="mb-2 text-sm font-semibold text-violet-200/90">פורמט</legend>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="פורמט קובץ">
              {FORMAT_OPTIONS.map((option) => {
                const checked = format === option.id;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer touch-manipulation flex-col gap-0.5 rounded-xl border px-3 py-2 transition-colors",
                      checked
                        ? "border-orange-400/55 bg-orange-500/10 ring-1 ring-orange-400/35"
                        : "border-violet-500/25 bg-[#12081a]/80 hover:border-violet-400/35",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={groupId}
                        value={option.id}
                        checked={checked}
                        onChange={() => setFormat(option.id)}
                        className="size-4 shrink-0 accent-orange-500"
                      />
                      <span className="text-base font-medium text-orange-50">{option.labelHe}</span>
                    </span>
                    <span className="pr-6 text-sm text-violet-300/85">{option.hint}</span>
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
            disabled={busy}
            onClick={() => void runDownload()}
          >
            {busy ? "מוריד…" : "הורדה"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 border-violet-500/40 px-5 text-base text-violet-100"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
