"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { houseHeadline } from "@/lib/labels";
import {
  returnRestoreReasons,
  type SkipReasonId,
} from "@/lib/skip-reasons";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

export function SkipHouseDialog({
  open,
  house,
  filters,
  now,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  house: PublicHouse | null;
  filters: HouseFiltersState;
  now: Date;
  onConfirm: (reason: SkipReasonId, temporary: boolean) => void;
  onCancel: () => void;
}) {
  const restoreOptions = house ? returnRestoreReasons(house, now, filters) : [];
  const [returnReason, setReturnReason] = useState<SkipReasonId>("not-open");
  const [temporary, setTemporary] = useState(true);

  useEffect(() => {
    if (!open || !house) return;
    const next = returnRestoreReasons(house, now, filters);
    setReturnReason(next[0]?.id ?? "not-open");
    setTemporary(true);
  }, [open, house, now, filters]);

  function close() {
    onCancel();
  }

  function confirm() {
    onConfirm(temporary ? returnReason : "other", temporary);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 border-orange-500/30 bg-[#160b1f] p-0 text-orange-50 sm:max-w-md"
        dir="rtl"
      >
        <OverlayCloseBar
          compact
          title="למה לדלג על הבית?"
          onClose={close}
          className="border-b border-orange-500/15 pb-2"
        />
        <div className="space-y-3 px-6 pt-4">
          {house ? (
            <p className="text-right text-base font-medium text-orange-100">{houseHeadline(house)}</p>
          ) : null}
          <DialogDescription className="text-right text-violet-200">
            הבית יוסר מהמסלול. אפשר לדלג זמנית ולהחזיר אוטומטית כשמצב הבית משתנה.
          </DialogDescription>
          <label className="flex items-start gap-2 rounded-xl border border-orange-500/15 bg-[#1a1028] px-3 py-3 text-base text-violet-100">
            <input
              type="checkbox"
              checked={temporary}
              onChange={(event) => setTemporary(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-orange-500/40 accent-orange-500"
            />
            <span>
              דילוג זמני — החזירו למסלול אם מצב הבית משתנה
              <span className="mt-0.5 block text-sm text-violet-300">
                למשל נפתח שוב, חזר מהפסקה, או חזרו ממתקים
              </span>
            </span>
          </label>
          {temporary ? (
            <div className="space-y-1.5 rounded-xl border border-orange-500/15 bg-[#1a1028] px-3 py-3">
              <label htmlFor="skip-return-reason" className="block text-right text-sm text-violet-300">
                החזירו למסלול כש…
              </label>
              <Select
                value={returnReason}
                onValueChange={(value) => setReturnReason(value as SkipReasonId)}
              >
                <SelectTrigger
                  id="skip-return-reason"
                  className="h-11 w-full border-orange-500/20 bg-[#14081c] text-base text-orange-50"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-orange-500/20 bg-[#1a1028] text-orange-50">
                  {restoreOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id} className="text-base">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter className="mx-0 mb-0 mt-2 border-0 bg-transparent p-0 px-6 pb-6">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              type="button"
              className="min-h-11 bg-orange-500 px-5 text-black hover:bg-orange-400"
              onClick={confirm}
            >
              דילוג מהמסלול
            </Button>
            <Button type="button" variant="outline" className="min-h-11 px-5" onClick={close}>
              ביטול
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
