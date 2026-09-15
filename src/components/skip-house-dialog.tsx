"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import { houseHeadline } from "@/lib/labels";
import {
  skipReasonLabel,
  TEMPORARY_RESTORE_OPTIONS,
  type SkipReasonId,
} from "@/lib/skip-reasons";
import type { HouseFiltersState, SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

export function SkipHouseDialog({
  open,
  house,
  filters: _filters,
  now: _now,
  existingMeta,
  existingNote = "",
  onConfirm,
  onUnskip,
  onCancel,
}: {
  open: boolean;
  house: PublicHouse | null;
  filters: HouseFiltersState;
  now: Date;
  existingMeta?: SkippedHouseMeta;
  existingNote?: string;
  onConfirm: (reason: SkipReasonId, temporary: boolean, note: string) => void;
  onUnskip?: () => void;
  onCancel: () => void;
}) {
  const editing = Boolean(existingMeta);
  const [returnReason, setReturnReason] = useState<SkipReasonId>("not-open");
  const [temporary, setTemporary] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open || !house) return;
    if (existingMeta) {
      setTemporary(existingMeta.temporary);
      const reason = existingMeta.reason as SkipReasonId;
      if (existingMeta.temporary) {
        setReturnReason(
          TEMPORARY_RESTORE_OPTIONS.some((item) => item.id === reason) ? reason : "not-open",
        );
      } else {
        setReturnReason("other");
      }
      setNote(existingNote);
      return;
    }
    setReturnReason("not-open");
    setTemporary(true);
    setNote("");
  }, [open, house, existingMeta, existingNote]);

  function close() {
    onCancel();
  }

  function confirm() {
    let reason: SkipReasonId;
    if (temporary) {
      reason = returnReason;
    } else if (existingMeta && !existingMeta.temporary) {
      reason = existingMeta.reason as SkipReasonId;
    } else {
      reason = "other";
    }
    onConfirm(reason, temporary, note.trim());
  }

  const showNoteField = !temporary || returnReason === "other";

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
              מצב נוכחי: {existingMeta.temporary ? "דילוג זמני" : "דילוג לצמיתות"}
              {!existingMeta.temporary ? ` · ${skipReasonLabel(existingMeta.reason as SkipReasonId)}` : null}
            </p>
          ) : null}
          <DialogDescription className="text-right text-violet-200">
            {editing
              ? "אפשר לשנות את סוג הדילוג, סיבת החזרה, או להסיר את הדילוג."
              : "הבית יוסר מהמסלול. אפשר לדלג זמנית ולהחזיר אוטומטית כשמצב הבית משתנה."}
          </DialogDescription>
          <div className="space-y-2 rounded-xl border border-orange-500/15 bg-[#1a1028] px-3 py-3">
            <label className="flex items-start gap-2 text-base text-violet-100">
              <input
                type="checkbox"
                checked={temporary}
                onChange={(event) => setTemporary(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-orange-500/40 accent-orange-500"
              />
              <span>דילוג זמני — החזירו למסלול אם מצב הבית משתנה</span>
            </label>
            <div
              className={`mr-6 space-y-2 ${temporary ? "" : "pointer-events-none opacity-45"}`}
              role="radiogroup"
              aria-label="החזירו למסלול כש"
            >
              {TEMPORARY_RESTORE_OPTIONS.map((option) => (
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
          {showNoteField ? (
            <div className="space-y-1.5 rounded-xl border border-orange-500/15 bg-[#1a1028] px-3 py-3">
              <label htmlFor="skip-personal-note" className="block text-right text-sm text-violet-300">
                הערה אישית (רק במכשיר הזה)
              </label>
              <Textarea
                id="skip-personal-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={240}
                placeholder="למה דילגתם? (אופציונלי)"
                className="min-h-20 resize-none border-orange-500/20 bg-[#14081c] text-base text-orange-50"
              />
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
                {editing ? "שמירת שינויים" : "דילוג מהמסלול"}
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
