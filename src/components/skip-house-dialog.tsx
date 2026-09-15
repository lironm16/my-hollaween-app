"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HouseEditModal } from "@/components/house-edit-modal";
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
    <HouseEditModal
      open={open}
      onClose={close}
      title={editing ? "עריכת דילוג" : "למה לדלג על הבית?"}
      subtitle={house ? houseHeadline(house) : undefined}
    >
      <div className="space-y-3">
        {editing && existingMeta ? (
          <p className="rounded-xl border border-orange-500/15 bg-[#1a1028] px-3 py-2 text-right text-sm text-violet-200">
            {skipMetaSummary(existingMeta)}
          </p>
        ) : null}
        <p className="text-right text-base text-violet-200">
          {editing ? "אפשר לשנות את סוג הדילוג או להסיר את הדילוג." : "הבית יוסר מהמסלול"}
        </p>
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
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            className="h-11 bg-orange-500 px-5 text-black hover:bg-orange-400"
            onClick={confirm}
          >
            {editing ? "שמירת שינויים" : "הסר מהמסלול"}
          </Button>
          <Button type="button" variant="outline" className="h-11 px-5" onClick={close}>
            ביטול
          </Button>
        </div>
        {editing && onUnskip ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full border-red-500/35 text-red-200 hover:bg-red-950/40"
            onClick={onUnskip}
          >
            הסרת דילוג
          </Button>
        ) : null}
      </div>
    </HouseEditModal>
  );
}
