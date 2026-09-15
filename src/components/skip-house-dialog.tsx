"use client";

import { useEffect, useMemo, useState } from "react";
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
  availableTemporaryRestoreOptions,
  skipMetaSummary,
  type SkipReasonId,
} from "@/lib/skip-reasons";
import type { HouseFiltersState, SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

export function SkipHouseDialog({
  open,
  house,
  filters,
  now,
  existingMeta,
  onConfirm,
  onUnskip,
  onCancel,
}: {
  open: boolean;
  house: PublicHouse | null;
  filters: HouseFiltersState;
  now: Date;
  existingMeta?: SkippedHouseMeta;
  onConfirm: (reason: SkipReasonId, temporary: boolean) => void;
  onUnskip?: () => void;
  onCancel: () => void;
}) {
  const editing = Boolean(existingMeta);
  const restoreOptions = useMemo(
    () => (house ? availableTemporaryRestoreOptions(house, now, filters) : []),
    [house, now, filters],
  );
  const canTempSkip = restoreOptions.length > 0;
  const [returnReason, setReturnReason] = useState<SkipReasonId>("not-open");
  const [temporary, setTemporary] = useState(false);

  useEffect(() => {
    if (!open || !house) return;
    const options = availableTemporaryRestoreOptions(house, now, filters);
    if (existingMeta) {
      const wantsTemp = existingMeta.temporary && canTempSkip;
      setTemporary(wantsTemp);
      const reason = existingMeta.reason as SkipReasonId;
      setReturnReason(
        wantsTemp && options.some((item) => item.id === reason)
          ? reason
          : (options[0]?.id ?? "other"),
      );
      return;
    }
    setReturnReason(options[0]?.id ?? "other");
    setTemporary(false);
  }, [open, house, now, filters, existingMeta, canTempSkip]);

  function close() {
    onCancel();
  }

  function confirm() {
    let reason: SkipReasonId;
    if (temporary && canTempSkip) {
      reason = returnReason;
    } else if (existingMeta && !existingMeta.temporary) {
      reason = existingMeta.reason as SkipReasonId;
    } else {
      reason = "other";
    }
    onConfirm(reason, temporary && canTempSkip);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(92dvh,calc(100dvh-1rem))] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden border-orange-500/30 bg-[#160b1f] p-0 text-orange-50 sm:max-w-md"
        dir="rtl"
      >
        <OverlayCloseBar
          compact
          title={editing ? "עריכת דילוג" : "למה לדלג על הבית?"}
          onClose={close}
          className="shrink-0 border-b border-orange-500/15 pb-2"
        />
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 pt-4">
          {house ? (
            <p className="text-right text-base font-medium text-orange-100">{houseHeadline(house)}</p>
          ) : null}
          {editing && existingMeta ? (
            <p className="rounded-xl border border-orange-500/15 bg-[#1a1028] px-3 py-2 text-right text-sm text-violet-200">
              {skipMetaSummary(existingMeta)}
            </p>
          ) : null}
          <DialogDescription className="text-right text-violet-200">
            {editing ? "אפשר לשנות את סוג הדילוג או להסיר את הדילוג." : "הבית יוסר מהמסלול"}
          </DialogDescription>
          {canTempSkip ? (
            <div className="space-y-2 rounded-xl border border-orange-500/15 bg-[#1a1028] px-3 py-3">
              <label className="flex items-start gap-2 text-base text-violet-100">
                <input
                  type="checkbox"
                  checked={temporary}
                  onChange={(event) => setTemporary(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 rounded border-orange-500/40 accent-orange-500"
                />
                <span>הבית יחזור למסלול כאשר</span>
              </label>
              <div
                className={`mr-6 space-y-2 ${temporary ? "" : "pointer-events-none opacity-45"}`}
                role="radiogroup"
                aria-label="הבית יחזור למסלול כאשר"
              >
                {restoreOptions.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-2 text-base text-violet-100"
                  >
                    <input
                      type="radio"
                      name="skip-return-reason"
                      value={option.id}
                      checked={returnReason === option.id}
                      disabled={!temporary}
                      onChange={() => setReturnReason(option.id)}
                      className="size-4 shrink-0 accent-orange-500"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter className="mx-0 mb-0 mt-2 shrink-0 border-0 bg-transparent p-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="grid w-full gap-2">
            <div className="grid w-full grid-cols-2 gap-2">
              <Button
                type="button"
                className="min-h-11 bg-orange-500 px-5 text-black hover:bg-orange-400"
                onClick={confirm}
              >
                {editing ? "שמירת שינויים" : "הסר מהמסלול"}
              </Button>
              <Button type="button" variant="outline" className="min-h-11 px-5" onClick={close}>
                ביטול
              </Button>
            </div>
            {editing && onUnskip ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 border-red-500/35 text-red-200 hover:bg-red-950/40"
                onClick={onUnskip}
              >
                הסרת דילוג
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
