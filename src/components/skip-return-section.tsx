"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HouseEditModal } from "@/components/house-edit-modal";
import { SkipIcon } from "@/components/skip-icon";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";
import {
  metaRestoreTriggers,
  skipMetaSummary,
  skipReturnSectionVisible,
  temporaryRestoreOptionsFromSnapshot,
  temporaryRestoreWhenLabel,
} from "@/lib/skip-reasons";
import type { TemporaryRestoreTriggerId } from "@/lib/skip-reasons";
import type { SkippedHouseMeta } from "@/lib/offline-db";
function RestoreWhenIcon({ trigger }: { trigger: TemporaryRestoreTriggerId }) {
  if (trigger === "not-open") {
    return <span className="skip-restore-when-icon is-open" aria-hidden />;
  }
  return <span className="skip-restore-when-icon is-candy" aria-hidden />;
}

function triggersEqual(a: TemporaryRestoreTriggerId[], b: TemporaryRestoreTriggerId[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((item) => set.has(item));
}

export function SkipReturnSection({
  house,
  meta,
  onSave,
  onClear,
}: {
  house: PublicHouse;
  meta: SkippedHouseMeta;
  onSave: (triggers: TemporaryRestoreTriggerId[]) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const available = useMemo(
    () => temporaryRestoreOptionsFromSnapshot(meta.statusKey),
    [meta.statusKey],
  );
  const saved = useMemo(() => metaRestoreTriggers(meta), [meta]);
  const [draft, setDraft] = useState(() => new Set<TemporaryRestoreTriggerId>(saved));

  useEffect(() => {
    if (!open) setDraft(new Set(saved));
  }, [open, saved]);

  if (!skipReturnSectionVisible(meta) || available.length === 0) return null;

  const hasSaved = saved.length > 0;
  const summary = hasSaved ? skipMetaSummary(meta) : null;
  const draftList = available.filter((id) => draft.has(id));
  const canSave =
    draftList.length > 0 && !triggersEqual(draftList, saved);

  function toggle(id: TemporaryRestoreTriggerId) {
    setDraft((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmSave() {
    if (!canSave) return;
    onSave(draftList);
    setOpen(false);
  }

  return (
    <>
      <div className="skip-return-section mb-2 py-0.5">
        {hasSaved ? (
          <div className="flex min-w-0 items-center gap-2 text-right">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-start"
              onClick={() => setOpen(true)}
            >
              <SkipIcon className="size-5 shrink-0 text-orange-400" aria-hidden />
              <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-lg font-medium text-violet-50">
                {saved.map((trigger, index) => (
                  <span key={trigger} className="inline-flex min-w-0 items-center gap-1.5">
                    {index > 0 ? <span className="text-violet-400">·</span> : null}
                    <RestoreWhenIcon trigger={trigger} />
                    <span className="truncate">{temporaryRestoreWhenLabel(trigger)}</span>
                  </span>
                ))}
              </span>
            </button>
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-violet-300 hover:bg-violet-500/10 hover:text-orange-100"
              aria-label="עריכת תנאי להחזרה"
              onClick={() => setOpen(true)}
            >
              <Pencil className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-violet-300 hover:bg-red-950/50 hover:text-red-200"
              aria-label="מחיקת תנאי להחזרה"
              onClick={onClear}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="flex w-full items-center justify-start gap-2.5 py-1 text-lg font-medium text-violet-100 hover:text-orange-50"
            onClick={() => setOpen(true)}
          >
            <SkipIcon className="size-5 shrink-0 text-orange-400" aria-hidden />
            <span>הוסף תנאי להחזרה</span>
          </button>
        )}
      </div>

      <HouseEditModal
        open={open}
        onClose={() => setOpen(false)}
        title="תנאי להחזרה"
        subtitle={houseHeadline(house)}
      >
        <div className="space-y-3">
          <p className="text-right text-base text-violet-200">ביטול דילוג כאשר:</p>
          <div className="space-y-2 rounded-xl border border-orange-500/15 bg-[#1a1028] px-3 py-3">
            {available.map((id) => (
              <label
                key={id}
                className="flex cursor-pointer items-center gap-3 text-lg text-violet-50"
              >
                <input
                  type="checkbox"
                  checked={draft.has(id)}
                  onChange={() => toggle(id)}
                  className="size-4 shrink-0 rounded border-orange-500/40 accent-orange-500"
                />
                <RestoreWhenIcon trigger={id} />
                <span className="font-medium">{temporaryRestoreWhenLabel(id)}</span>
              </label>
            ))}
          </div>
          {summary && hasSaved ? (
            <p className="text-right text-sm text-violet-400">{summary}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              className="h-11 bg-orange-500 px-5 text-black hover:bg-orange-400 disabled:opacity-40"
              disabled={!canSave}
              onClick={confirmSave}
            >
              שמירה
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-5"
              onClick={() => setOpen(false)}
            >
              ביטול
            </Button>
          </div>
        </div>
      </HouseEditModal>
    </>
  );
}
