"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { houseHeadline } from "@/lib/labels";
import {
  isTemporarySkipReason,
  suggestedSkipReasons,
  type SkipReasonId,
} from "@/lib/skip-reasons";
import type { HouseFiltersState } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const options = house ? suggestedSkipReasons(house, now, filters) : [];
  const [reason, setReason] = useState<SkipReasonId>("other");
  const [temporary, setTemporary] = useState(true);

  useEffect(() => {
    if (!open || !house) return;
    const next = suggestedSkipReasons(house, now, filters);
    const first = next[0]?.id ?? "other";
    setReason(first);
    setTemporary(isTemporarySkipReason(first));
  }, [open, house, now, filters]);

  useEffect(() => {
    setTemporary(isTemporarySkipReason(reason));
  }, [reason]);

  function close() {
    onCancel();
  }

  function confirm() {
    onConfirm(reason, temporary);
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
            הבית יוסר מהמסלול. אפשר לדלג זמנית אם המצב ישתנה.
          </DialogDescription>
          <fieldset className="space-y-2">
            <legend className="sr-only">סיבת דילוג</legend>
            {options.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-base transition-colors",
                  reason === option.id
                    ? "border-orange-400/50 bg-orange-500/10 text-orange-50"
                    : "border-orange-500/15 bg-[#1a1028] text-violet-100",
                )}
              >
                <input
                  type="radio"
                  name="skip-reason"
                  value={option.id}
                  checked={reason === option.id}
                  onChange={() => setReason(option.id)}
                  className="size-4 shrink-0 accent-orange-500"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
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
