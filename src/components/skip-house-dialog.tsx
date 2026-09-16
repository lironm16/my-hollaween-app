"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HouseSkippedBanner } from "@/components/house-skipped-banner";
import { HouseEditModal } from "@/components/house-edit-modal";
import { houseHeadline } from "@/lib/labels";
import {
  availableTemporaryRestoreOptions,
  metaRestoreTriggers,
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
  const restoreOptions = useMemo(
    () => (house ? availableTemporaryRestoreOptions(house, now, filters) : []),
    [house, now, filters],
  );
  const canTempSkip = restoreOptions.length > 0;
  const [selectedTriggers, setSelectedTriggers] = useState<Set<TemporaryRestoreTriggerId>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!open || !house) return;
    const options = availableTemporaryRestoreOptions(house, now, filters);
    const optionIds = options.map((option) => option.id as TemporaryRestoreTriggerId);
    if (existingMeta) {
      const saved = metaRestoreTriggers(existingMeta).filter((id) => optionIds.includes(id));
      setSelectedTriggers(new Set(saved.length > 0 ? saved : optionIds));
      return;
    }
    setSelectedTriggers(new Set(optionIds));
  }, [open, house, now, filters, existingMeta]);

  function close() {
    onCancel();
  }

  function toggleTrigger(id: TemporaryRestoreTriggerId) {
    setSelectedTriggers((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    const triggers = restoreOptions
      .map((option) => option.id as TemporaryRestoreTriggerId)
      .filter((id) => selectedTriggers.has(id));
    const temporary = triggers.length > 0;
    let reason: SkipReasonId;
    if (temporary) {
      reason = triggers[0]!;
    } else if (existingMeta && !existingMeta.temporary) {
      reason = existingMeta.reason as SkipReasonId;
    } else {
      reason = "other";
    }
    onConfirm(reason, temporary, triggers);
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
        {canTempSkip ? (
          <div className="space-y-2 rounded-xl border border-orange-500/15 bg-[#1a1028] px-3 py-3">
            {restoreOptions.map((option) => {
              const id = option.id as TemporaryRestoreTriggerId;
              return (
                <label
                  key={option.id}
                  className="flex items-start gap-2 text-base text-violet-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedTriggers.has(id)}
                    onChange={() => toggleTrigger(id)}
                    className="mt-0.5 size-4 shrink-0 rounded border-orange-500/40 accent-orange-500"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            className="h-11 bg-orange-500 px-5 text-black hover:bg-orange-400"
            onClick={confirm}
          >
            {editing ? "שמירת שינויים" : "דילוג על בית"}
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
