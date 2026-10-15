"use client";

import { Button } from "@/components/ui/button";
import { HouseEditModal } from "@/components/house-edit-modal";
import { skipRestoreUndoPromptMessage } from "@/lib/skip-reasons";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import type { PublicHouse } from "@/lib/types";

export function SkipRestoreUndoDialog({
  house,
  meta,
  open,
  onConfirmUnskip,
  onDismiss,
}: {
  house: PublicHouse;
  meta: SkippedHouseMeta;
  open: boolean;
  onConfirmUnskip: () => void;
  onDismiss: () => void;
}) {
  return (
    <HouseEditModal open={open} onClose={onDismiss} title="הבית חזר לרשימה">
      <div className="space-y-4">
        <p className="text-right text-lg leading-relaxed text-violet-100">
          {skipRestoreUndoPromptMessage(house, meta)}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            className="h-11 bg-orange-500 px-4 text-black hover:bg-orange-400"
            onClick={onConfirmUnskip}
          >
            ביטול דילוג
          </Button>
          <Button type="button" variant="outline" className="h-11 px-4" onClick={onDismiss}>
            להשאיר דילוג
          </Button>
        </div>
      </div>
    </HouseEditModal>
  );
}
