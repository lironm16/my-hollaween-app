"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HouseSkippedBanner } from "@/components/house-skipped-banner";
import { HouseEditModal } from "@/components/house-edit-modal";
import { useLocale } from "@/hooks/use-locale";
import { localizedTemporaryRestoreOptionLabel } from "@/lib/i18n/skip-copy";
import { houseHeadline } from "@/lib/labels";
import {
  availableTemporaryRestoreOptions,
  metaRestoreTriggers,
  type SkipReasonId,
  type TemporaryRestoreTriggerId,
} from "@/lib/skip-reasons";
import type { HouseFiltersState, SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const { dir, locale, t } = useLocale();
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
      setSelectedTriggers(new Set(saved));
      return;
    }
    setSelectedTriggers(new Set());
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
      title={editing ? t("skipDialog.editTitle") : t("skipDialog.skipTitle")}
      subtitle={house ? houseHeadline(house) : undefined}
    >
      <div className="space-y-3">
        {editing && existingMeta ? (
          <HouseSkippedBanner meta={existingMeta} />
        ) : null}
        <p className="text-start text-base text-violet-200">
          {editing ? t("skipDialog.editingHint") : t("skipDialog.skipHint")}
        </p>
        {canTempSkip ? (
          <div className="space-y-2 rounded-xl border border-orange-500/15 bg-[#1a1028] px-3 py-3">
            {restoreOptions.map((option) => {
              const id = option.id as TemporaryRestoreTriggerId;
              return (
                <label
                  key={option.id}
                  className="flex items-start gap-2 text-start text-base text-violet-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedTriggers.has(id)}
                    onChange={() => toggleTrigger(id)}
                    className="mt-0.5 size-4 shrink-0 rounded border-orange-500/40 accent-orange-500"
                  />
                  <span>{localizedTemporaryRestoreOptionLabel(locale, id)}</span>
                </label>
              );
            })}
          </div>
        ) : null}
        <div className={cn("flex gap-2 pt-1", dir === "ltr" && "flex-row-reverse")}>
          <Button
            type="button"
            className="min-w-0 flex-1 h-11 bg-orange-500 px-5 text-black hover:bg-orange-400"
            onClick={confirm}
          >
            {editing ? t("skipDialog.confirmEdit") : t("skipDialog.confirm")}
          </Button>
          <Button type="button" variant="outline" className="min-w-0 flex-1 h-11 px-5" onClick={close}>
            {t("common.cancel")}
          </Button>
        </div>
        {editing && onUnskip ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full border-red-500/35 text-red-200 hover:bg-red-950/40"
            onClick={onUnskip}
          >
            {t("skipDialog.removeSkip")}
          </Button>
        ) : null}
      </div>
    </HouseEditModal>
  );
}
