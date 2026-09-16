"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HouseSkippedBanner } from "@/components/house-skipped-banner";
import { HouseEditModal } from "@/components/house-edit-modal";
import { houseHeadline } from "@/lib/labels";
import {
  primaryTemporaryRestoreOption,
  type SkipReasonId,
  type TemporaryRestoreTriggerId,
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
  onConfirm: (
    reason: SkipReasonId,
    temporary: boolean,
    restoreTriggers: TemporaryRestoreTriggerId[],
  ) => void;
  onUnskip?: () => void;
  onCancel: () => void;
}) {
  const editing = Boolean(existingMeta);
  const restoreOption = useMemo(
    () => (house ? primaryTemporaryRestoreOption(house, now, filters) : null),
    [house, now, filters],
  );
  const canTempSkip = restoreOption != null;
  const [temporary, setTemporary] = useState(true);

  useEffect(() => {
    if (!open || !house) return;
    if (existingMeta?.temporary) {
      setTemporary(true);
      return;
    }
    setTemporary(canTempSkip);
  }, [open, house, existingMeta, canTempSkip]);

  function close() {
    onCancel();
  }

  function confirm() {
    const triggers: TemporaryRestoreTriggerId[] =
      temporary && restoreOption && restoreOption.id !== "other"
        ? [restoreOption.id as TemporaryRestoreTriggerId]
        : [];
    const isTemporary = triggers.length > 0;
    let reason: SkipReasonId;
    if (isTemporary) {
      reason = triggers[0]!;
    } else if (existingMeta && !existingMeta.temporary) {
      reason = existingMeta.reason as SkipReasonId;
    } else {
      reason = "other";
    }
    onConfirm(reason, isTemporary, triggers);
  }

  return (
    <HouseEditModal
      open={open}
      onClose={close}
      title={editing ? "עריכת דילוג" : "דילוג על בית"}
      subtitle={house ? houseHeadline(house) : undefined}
    >
      <div className="space-y-3">
        {editing && existingMeta ? (
          <HouseSkippedBanner meta={existingMeta} />
        ) : null}
        <p className="text-right text-base text-violet-200">
          {editing ? "אפשר לשנות את סוג הדילוג או להסיר את הדילוג." : "דילגתם על הבית"}
        </p>
        {canTempSkip && restoreOption ? (
          <div className="rounded-xl border border-orange-500/15 bg-[#1a1028] px-3 py-3">
            <label className="flex items-start gap-2 text-base text-violet-100">
              <input
                type="checkbox"
                checked={temporary}
                onChange={(event) => setTemporary(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-orange-500/40 accent-orange-500"
              />
              <span>{restoreOption.label}</span>
            </label>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            className="h-11 bg-orange-500 px-5 text-black hover:bg-orange-400"
            onClick={confirm}
          >
            {editing ? "שמירת שינויים" : "אישור"}
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
